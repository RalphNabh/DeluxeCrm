"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface StatsCardsProps {
  stats: StatCard[];
  className?: string;
}

function AnimatedNumber({ value, duration = 1000 }: { value: string | number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue)) {
      setDisplayValue(value as number);
      return;
    }

    const startValue = 0;
    const endValue = numValue;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(Math.floor(currentValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
    return <span className="animate-count-up">{value}</span>;
  }

  return <span className="animate-count-up">{displayValue.toLocaleString()}</span>;
}

export default function StatsCards({ stats, className = "" }: StatsCardsProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${className}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const iconBg = stat.iconBg || "bg-teal-100";
        const iconColor = stat.iconColor || "text-teal-600";
        
        // Determine if we should animate the number
        const shouldAnimate = typeof stat.value === 'number' || (typeof stat.value === 'string' && /^\d+$/.test(stat.value.trim()));
        
        return (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 card-hover stagger-item">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {shouldAnimate ? (
                      <AnimatedNumber value={stat.value} />
                    ) : (
                      <span className="animate-count-up">{stat.value}</span>
                    )}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                  {stat.trend && (
                    <div className="flex items-center mt-1">
                      <span className={`text-xs font-medium ${
                        stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.trend.isPositive ? '+' : ''}{stat.trend.value}%
                      </span>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${iconBg} rounded-lg transition-transform duration-200 hover:scale-110`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


