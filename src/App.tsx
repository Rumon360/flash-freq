import React, { useState, useCallback, useMemo } from "react";
import {
  Upload,
  FileText,
  Download,
  TrendingUp,
  PieChart,
  Eye,
  AlertCircle,
} from "lucide-react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ColumnStats, CsvData, FrequencyData } from "@/types/index";
import Header from "@/components/header";

function App() {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [frequencyData, setFrequencyData] = useState<FrequencyData[]>([]);
  const [columnStats, setColumnStats] = useState<ColumnStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTopN, setShowTopN] = useState<string>("all");

  const { toast } = useToast();

  const filteredFrequencyData = useMemo(() => {
    let filtered = frequencyData.filter((item) =>
      item.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showTopN !== "all") {
      const limit = parseInt(showTopN);
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [frequencyData, searchTerm, showTopN]);

  const chartData = useMemo(() => {
    return filteredFrequencyData.slice(0, 20).map((item) => ({
      name:
        item.value.length > 15
          ? item.value.substring(0, 15) + "..."
          : item.value,
      fullName: item.value,
      count: item.count,
      percentage: item.percentage,
    }));
  }, [filteredFrequencyData]);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      setFileName(file.name);

      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as string[][];
            if (data.length === 0) {
              throw new Error("Empty CSV file");
            }

            const headers = data[0];
            const rows = data.slice(1);

            setCsvData({ headers, rows });
            setSelectedColumn("");
            setFrequencyData([]);
            setColumnStats(null);
            setSearchTerm("");

            toast({
              title: "File uploaded successfully",
              description: `Loaded ${rows.length} rows with ${headers.length} columns.`,
            });
          } catch (error) {
            console.log(error);
            toast({
              title: "Error parsing CSV",
              description: "Please check your file format and try again.",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        },
        error: (error) => {
          toast({
            title: "Error reading file",
            description: error.message,
            variant: "destructive",
          });
          setIsLoading(false);
        },
      });
    },
    [toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const isNumericColumn = useCallback((values: string[]): boolean => {
    const nonEmptyValues = values.filter((v) => v.trim() !== "");
    if (nonEmptyValues.length === 0) return false;

    const numericValues = nonEmptyValues.filter(
      (v) => !isNaN(Number(v)) && isFinite(Number(v))
    );
    return numericValues.length / nonEmptyValues.length > 0.8; // 80% numeric threshold
  }, []);

  const calculateNumericStats = useCallback((values: number[]) => {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
    };
  }, []);

  const calculateFrequency = useCallback(
    (columnIndex: number) => {
      if (!csvData) return;

      const values = csvData.rows.map((row) => row[columnIndex] || "");
      const nonEmptyValues = values.filter((v) => v.trim() !== "");
      const emptyCount = values.length - nonEmptyValues.length;

      const frequencyMap = new Map<string, number>();

      values.forEach((value) => {
        const trimmedValue = value.trim();
        const displayValue = trimmedValue || "(empty)";
        frequencyMap.set(
          displayValue,
          (frequencyMap.get(displayValue) || 0) + 1
        );
      });

      const total = values.length;
      const frequencies: FrequencyData[] = Array.from(frequencyMap.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / total) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      const isNumeric = isNumericColumn(nonEmptyValues);
      let numericStats;

      if (isNumeric) {
        const numericValues = nonEmptyValues
          .map((v) => Number(v))
          .filter((v) => !isNaN(v) && isFinite(v));
        if (numericValues.length > 0) {
          numericStats = calculateNumericStats(numericValues);
        }
      }

      const stats: ColumnStats = {
        totalValues: total,
        uniqueValues: frequencyMap.size,
        emptyValues: emptyCount,
        mostCommon: frequencies[0]?.value || "",
        leastCommon: frequencies[frequencies.length - 1]?.value || "",
        isNumeric,
        numericStats,
      };

      setFrequencyData(frequencies);
      setColumnStats(stats);
    },
    [csvData, isNumericColumn, calculateNumericStats]
  );

  const handleColumnChange = useCallback(
    (value: string) => {
      setSelectedColumn(value);
      setSearchTerm("");
      const columnIndex = csvData?.headers.indexOf(value);
      if (columnIndex !== undefined && columnIndex >= 0) {
        calculateFrequency(columnIndex);
      }
    },
    [csvData, calculateFrequency]
  );

  const exportResults = useCallback(() => {
    if (frequencyData.length === 0) return;

    const csvContent = [
      ["Value", "Count", "Percentage"],
      ...filteredFrequencyData.map((item) => [
        item.value,
        item.count.toString(),
        `${item.percentage.toFixed(2)}%`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const exportFileName = `${fileName.replace(
      ".csv",
      ""
    )}_${selectedColumn}_frequency.csv`;
    saveAs(blob, exportFileName);

    toast({
      title: "Export successful",
      description: `Frequency analysis saved as ${exportFileName}`,
    });
  }, [
    frequencyData.length,
    filteredFrequencyData,
    fileName,
    selectedColumn,
    toast,
  ]);

  return (
    <div className="min-h-screen container mx-auto pt-10 px-4">
      <div className="space-y-8">
        {/* Header */}
        <Header />

        {/* File Upload */}
        <Card
          className={`border-2 transition-all duration-300 border-dashed border-blue-300 bg-white/70 hover:bg-white/90 backdrop-blur-sm`}
        >
          <CardContent className="p-8">
            <div
              className={`text-center space-y-6 cursor-pointer transition-all duration-300 rounded-xl p-8 `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className={`transition-transform duration-300`}>
                <Upload
                  className={`h-16 w-16 mx-auto transition-colors duration-300`}
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                  {isLoading
                    ? "Processing your file..."
                    : "Upload your CSV file"}
                </h3>
                <p className="text-slate-600 text-lg">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Supports files up to 50MB
                </p>
              </div>
              {isLoading && (
                <div className="w-64 mx-auto">
                  <Progress value={66} className="h-2" />
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {csvData && (
          <>
            {/* File Info & Controls */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-slate-900">
                        {fileName}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {csvData.rows.length.toLocaleString()} rows ×{" "}
                        {csvData.headers.length} columns
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 px-3 py-1"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {csvData.rows.length.toLocaleString()} records
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1">
                      {csvData.headers.length} columns
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedColumn}
                      onValueChange={handleColumnChange}
                    >
                      <SelectTrigger className="">
                        <SelectValue placeholder="Select a column to analyze" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvData.headers.map((header, index) => (
                          <SelectItem key={index} value={header}>
                            <div className="flex items-center gap-2">
                              <span>{header}</span>
                              <Badge variant="outline" className="text-xs">
                                Col {index + 1}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {frequencyData.length > 0 && (
                    <Button onClick={exportResults} variant={"outline"}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Analysis
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <CardTitle>Data Preview</CardTitle>
                </div>
                <CardDescription>First 20 rows of your dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50">
                          {csvData.headers.map((header, index) => (
                            <TableHead
                              key={index}
                              className="font-semibold text-slate-700 whitespace-nowrap px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                {header}
                                <Badge variant="outline" className="text-xs">
                                  {index + 1}
                                </Badge>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.rows.slice(0, 20).map((row, rowIndex) => (
                          <TableRow
                            key={rowIndex}
                            className="hover:bg-blue-50/30 transition-colors"
                          >
                            {row.map((cell, cellIndex) => (
                              <TableCell
                                key={cellIndex}
                                className="whitespace-nowrap px-4 py-3"
                              >
                                {cell || (
                                  <span className="text-slate-400 italic">
                                    empty
                                  </span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {csvData.rows.length > 20 && (
                  <p className="text-sm text-slate-500 mt-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Showing first 20 of {csvData.rows.length.toLocaleString()}{" "}
                    rows
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {frequencyData.length > 0 && columnStats && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-blue-600" />
                      <CardTitle>Analysis Results</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Search values..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-48"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={showTopN} onValueChange={setShowTopN}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="25">Top 25</SelectItem>
                            <SelectItem value="50">Top 50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    Distribution analysis for column "{selectedColumn}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="table">Data Table</TabsTrigger>
                      <TabsTrigger value="bar-chart">Bar Chart</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      {/* Statistics Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-700">
                              {columnStats.totalValues.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-600">
                              Total Values
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-700">
                              {columnStats.uniqueValues.toLocaleString()}
                            </div>
                            <div className="text-sm text-green-600">
                              Unique Values
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-700">
                              {columnStats.emptyValues.toLocaleString()}
                            </div>
                            <div className="text-sm text-orange-600">
                              Empty Values
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-purple-700">
                              {(
                                (columnStats.uniqueValues /
                                  columnStats.totalValues) *
                                100
                              ).toFixed(1)}
                              %
                            </div>
                            <div className="text-sm text-purple-600">
                              Uniqueness
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Top Values Preview */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Most Common Values
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {filteredFrequencyData
                              .slice(0, 5)
                              .map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      variant="outline"
                                      className="w-8 h-8 rounded-full flex items-center justify-center"
                                    >
                                      {index + 1}
                                    </Badge>
                                    <span className="font-medium">
                                      {item.value}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="font-semibold">
                                        {item.count.toLocaleString()}
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        {item.percentage.toFixed(1)}%
                                      </div>
                                    </div>
                                    <div className="w-24 bg-slate-200 rounded-full h-2">
                                      <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                                        style={{
                                          width: `${Math.max(
                                            item.percentage,
                                            2
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="table" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                          Showing {filteredFrequencyData.length} of{" "}
                          {frequencyData.length} unique values
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto max-h-96">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gradient-to-r from-slate-50 to-blue-50">
                                <TableHead className="font-semibold w-12">
                                  #
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Value
                                </TableHead>
                                <TableHead className="font-semibold text-right">
                                  Count
                                </TableHead>
                                <TableHead className="font-semibold text-right">
                                  Percentage
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredFrequencyData.map((item, index) => (
                                <TableRow
                                  key={index}
                                  className="hover:bg-blue-50/30 transition-colors"
                                >
                                  <TableCell className="font-medium">
                                    <Badge
                                      variant="outline"
                                      className="w-8 h-8 rounded-full flex items-center justify-center"
                                    >
                                      {index + 1}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium max-w-xs">
                                    <div
                                      className="truncate"
                                      title={item.value}
                                    >
                                      {item.value}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold">
                                    {item.count.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold">
                                    {item.percentage.toFixed(2)}%
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="bar-chart" className="space-y-4">
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 60,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                            />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              fontSize={12}
                            />
                            <YAxis />
                            <Tooltip
                              formatter={(value) => [value, "Count"]}
                              labelFormatter={(label) => {
                                const item = chartData.find(
                                  (d) => d.name === label
                                );
                                return item?.fullName || label;
                              }}
                            />
                            <Bar
                              dataKey="count"
                              fill="#3B82F6"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-sm text-slate-500 text-center">
                        Showing top 20 values by frequency
                      </p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <Toaster />
      <div className="absolute top-4 right-4">
        <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
          Internal tool
        </Badge>
      </div>
    </div>
  );
}

export default App;
