"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  min?: string; // Format: "HH:MM" for minimum time
}

export default function TimePicker({
  value = '',
  onChange,
  label = "Time",
  required = false,
  min,
}: TimePickerProps) {
  // Ensure we have a valid format
  const timeValue = value && value.includes(':') ? value : '';
  const [hours, minutes] = timeValue ? timeValue.split(':') : ['', ''];

  const handleHourChange = (hour: string) => {
    const newTime = `${hour}:${minutes || '00'}`;
    onChange(newTime);
  };

  const handleMinuteChange = (minute: string) => {
    const newTime = `${hours || '00'}:${minute}`;
    onChange(newTime);
  };

  // Generate hour options
  const hoursOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, '0');
    return hour;
  });

  // Generate minute options (in 5-minute increments)
  const minutesOptions = Array.from({ length: 12 }, (_, i) => {
    const minute = String(i * 5).padStart(2, '0');
    return minute;
  });

  // Filter options based on min constraint
  const getFilteredHours = () => {
    if (!min) return hoursOptions;
    const [minHour, minMinute] = min.split(':');
    if (minutes && minutes === minMinute && hours) {
      return hoursOptions.filter((h) => parseInt(h) >= parseInt(minHour));
    }
    return hoursOptions;
  };

  const getFilteredMinutes = () => {
    if (!min || !hours) return minutesOptions;
    const [minHour, minMinute] = min.split(':');
    if (hours === minHour) {
      return minutesOptions.filter((m) => parseInt(m) >= parseInt(minMinute));
    }
    return minutesOptions;
  };

  return (
    <div className="space-y-2">
      <Label>{label}{required && ' *'}</Label>
      <div className="flex items-center gap-2">
        <Select value={hours} onValueChange={handleHourChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent>
            {getFilteredHours().map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg font-semibold text-gray-500">:</span>
        <Select value={minutes} onValueChange={handleMinuteChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {getFilteredMinutes().map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-gray-500 w-12 text-right">
          {hours && minutes
            ? (() => {
                const hour24 = parseInt(hours);
                const period = hour24 >= 12 ? 'PM' : 'AM';
                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                return `${hour12}:${minutes} ${period}`;
              })()
            : ''}
        </div>
      </div>
    </div>
  );
}

