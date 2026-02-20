interface CircularGaugeProps {
  value: number;
  label: string;
  color?: 'blue' | 'cyan' | 'green' | 'orange' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const colorConfig = {
  blue: {
    stroke: 'stroke-blue-500',
    text: 'text-blue-400',
    bg: 'text-blue-500/20',
  },
  cyan: {
    stroke: 'stroke-cyan-500',
    text: 'text-cyan-400',
    bg: 'text-cyan-500/20',
  },
  green: {
    stroke: 'stroke-green-500',
    text: 'text-green-400',
    bg: 'text-green-500/20',
  },
  orange: {
    stroke: 'stroke-orange-500',
    text: 'text-orange-400',
    bg: 'text-orange-500/20',
  },
  purple: {
    stroke: 'stroke-purple-500',
    text: 'text-purple-400',
    bg: 'text-purple-500/20',
  },
};

const sizeConfig = {
  sm: { size: 60, strokeWidth: 4, fontSize: 'text-xs' },
  md: { size: 80, strokeWidth: 5, fontSize: 'text-sm' },
  lg: { size: 100, strokeWidth: 6, fontSize: 'text-base' },
};

export function CircularGauge({
  value,
  label,
  color = 'cyan',
  size = 'md',
  showValue = true,
}: CircularGaugeProps) {
  const colors = colorConfig[color];
  const dimensions = sizeConfig[size];

  const radius = (dimensions.size - dimensions.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg
          width={dimensions.size}
          height={dimensions.size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            fill="none"
            strokeWidth={dimensions.strokeWidth}
            className="stroke-slate-700/50"
          />
          {/* Progress circle */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            fill="none"
            strokeWidth={dimensions.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${colors.stroke} transition-all duration-500 ease-out`}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono font-bold ${dimensions.fontSize} ${colors.text}`}>
              {normalizedValue}%
            </span>
          </div>
        )}
      </div>
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
