import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  gradient?: "blue" | "green" | "red" | "purple" | "orange";
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  className,
  gradient = "blue"
}: StatsCardProps) {
  const gradientClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600", 
    red: "from-red-500 to-red-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
      <div className={`h-2 bg-gradient-to-r ${gradientClasses[gradient]}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradientClasses[gradient]} bg-opacity-10`}>
            <Icon className={`h-4 w-4 text-${gradient}-600`} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {(description || trend) && (
          <div className="flex items-center justify-between mt-2">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className={cn(
                "text-xs font-medium flex items-center gap-1",
                trend.value > 0 ? "text-green-600" : trend.value < 0 ? "text-red-600" : "text-muted-foreground"
              )}>
                {trend.value > 0 && "↗"}
                {trend.value < 0 && "↘"}
                {trend.value === 0 && "→"}
                <span>{Math.abs(trend.value)}% {trend.label}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}