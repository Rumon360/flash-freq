import { LineShadowText } from "./magicui/line-shadow-text";

function Header() {
  return (
    <div className="text-center space-y-4 pt-8 pb-4">
      <div className="flex items-center justify-center gap-4 mb-4">
        <h1 className="text-5xl font-bold font-mono">
          Flash
          <LineShadowText as={"span"}>FreQ</LineShadowText>
        </h1>
      </div>
      <p className="text-xl font-medium text-muted-foreground max-w-3xl mx-auto leading-relaxed">
        Upload your CSV file, explore data patterns, analyze column
        distributions, and export insights with beautiful visualizations
      </p>
    </div>
  );
}

export default Header;
