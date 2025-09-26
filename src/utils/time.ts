import { format, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Jakarta';

export const getCurrentWIBTime = (): Date => {
  return toZonedTime(new Date(), TIMEZONE);
};

export const formatWIBDate = (date: Date, formatStr: string = 'yyyy-MM-dd'): string => {
  const wibDate = toZonedTime(date, TIMEZONE);
  return format(wibDate, formatStr);
};

export const getTodayWIB = (): Date => {
  return getCurrentWIBTime();
};

export const getTomorrowWIB = (): Date => {
  const today = getCurrentWIBTime();
  return addDays(today, 1);
};

export const getDayName = (date: Date): string => {
  const wibDate = toZonedTime(date, TIMEZONE);
  return format(wibDate, 'EEEE').toLowerCase();
};

export const getDayNameInIndonesian = (date: Date): string => {
  const dayName = getDayName(date);
  const dayMap: { [key: string]: string } = {
    'monday': 'senin',
    'tuesday': 'selasa',
    'wednesday': 'rabu',
    'thursday': 'kamis',
    'friday': 'jumat',
    'saturday': 'sabtu',
    'sunday': 'minggu'
  };
  return dayMap[dayName] || dayName;
};

export const getDayNameForDatabase = (date: Date): string => {
  const dayName = getDayName(date);
  const dayMap: { [key: string]: string } = {
    'monday': 'Senin',
    'tuesday': 'Selasa',
    'wednesday': 'Rabu',
    'thursday': 'Kamis',
    'friday': 'Jumat',
    'saturday': 'Sabtu',
    'sunday': 'Minggu'
  };
  return dayMap[dayName] || dayName;
};

export const getIndonesianDayDisplay = (dayName: string): string => {
  // Convert database format (Jumat) to display format (JUMAT)
  return dayName.toUpperCase();
};

export const parseIndonesianDay = (dayInput: string): string | null => {
  const dayMap: { [key: string]: string } = {
    'senin': 'Senin',
    'selasa': 'Selasa',
    'rabu': 'Rabu',
    'kamis': 'Kamis',
    'jumat': 'Jumat',
    'sabtu': 'Sabtu',
    'minggu': 'Minggu'
  };
  return dayMap[dayInput.toLowerCase()] || null;
};

export const getCurrentWeekRange = (): { start: Date; end: Date } => {
  const now = getCurrentWIBTime();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  return { start, end };
};

export const isDateInCurrentWeek = (date: Date): boolean => {
  const { start, end } = getCurrentWeekRange();
  return isWithinInterval(date, { start, end });
};

export const getWeekNumber = (date: Date): number => {
  const wibDate = toZonedTime(date, TIMEZONE);
  const startOfYear = new Date(wibDate.getFullYear(), 0, 1);
  const days = Math.floor((wibDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

/**
 * Calculate the number of payable weeks between two dates
 * Only counts weeks that fall in active months: October (10), November (11), December (12), April (4), May (5), June (6)
 * Ignores weeks in January, February, March, July, August, September
 */
export const calculatePayableWeeks = (startDate: Date | string, endDate: Date | string): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Convert to WIB timezone
  const startWIB = toZonedTime(start, TIMEZONE);
  const endWIB = toZonedTime(end, TIMEZONE);
  
  // Active months for kas payment (1-based: Jan=1, Feb=2, etc.)
  const activeMonths = [10, 11, 12, 4, 5, 6]; // Oct, Nov, Dec, Apr, May, Jun
  
  let payableWeeks = 0;
  let currentDate = new Date(startWIB);
  
  // Iterate through each week from start to end
  while (currentDate <= endWIB) {
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-based, so add 1
    
    // Check if current week falls in an active month
    if (activeMonths.includes(currentMonth)) {
      payableWeeks++;
    }
    
    // Move to next week (add 7 days)
    currentDate = addDays(currentDate, 7);
  }
  
  return payableWeeks;
};

/**
 * Get the default kas period start date
 * This can be modified based on school's academic calendar
 */
export const getKasPeriodStart = (): string => {
  return '2024-10-01'; // October 1st, 2024 - adjust as needed
};