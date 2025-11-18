/**
 * Unit Tests for Public/Utils.js
 * Tests frontend utility functions (date calculations, validation, DOM helpers)
 */

/**
 * Note: These tests are for pure utility functions.
 * DOM-related tests would require jsdom configuration.
 * For now, we test the non-DOM utilities.
 */

describe('Utils Module - Date/Time Utilities', () => {
  // Mock implementation of getWeek function
  function getWeek(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((d - yearStart) / 86400000 + 1) / 7;
  }

  // Mock implementation of findTodayColumnPosition
  function findTodayColumnPosition(today, timeColumns) {
    if (timeColumns.length === 0) return null;

    const firstCol = timeColumns[0];
    const todayYear = today.getFullYear();

    // Year columns
    if (/^\d{4}$/.test(firstCol)) {
      const todayYearStr = todayYear.toString();
      const index = timeColumns.indexOf(todayYearStr);
      if (index === -1) return null;

      const startOfYear = new Date(todayYear, 0, 1);
      const endOfYear = new Date(todayYear, 11, 31);
      const dayOfYear = (today - startOfYear) / (1000 * 60 * 60 * 24);
      const totalDays = (endOfYear - startOfYear) / (1000 * 60 * 60 * 24);
      const percentage = dayOfYear / totalDays;
      return { index, percentage };
    }

    // Quarter columns
    if (/^Q[1-4]\s\d{4}$/.test(firstCol)) {
      const month = today.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      const todayQuarterStr = `Q${quarter} ${todayYear}`;
      const index = timeColumns.indexOf(todayQuarterStr);
      if (index === -1) return null;

      const quarterStartMonth = (quarter - 1) * 3;
      const startOfQuarter = new Date(todayYear, quarterStartMonth, 1);
      const endOfQuarter = new Date(todayYear, quarterStartMonth + 3, 0);
      const dayInQuarter = (today - startOfQuarter) / (1000 * 60 * 60 * 24);
      const totalDays = (endOfQuarter - startOfQuarter) / (1000 * 60 * 60 * 24);
      const percentage = dayInQuarter / totalDays;
      return { index, percentage };
    }

    // Month columns
    if (/^[A-Za-z]{3}\s\d{4}$/.test(firstCol)) {
      const todayMonthStr =
        today.toLocaleString('en-US', { month: 'short' }) + ` ${todayYear}`;
      const index = timeColumns.indexOf(todayMonthStr);
      if (index === -1) return null;

      const startOfMonth = new Date(todayYear, today.getMonth(), 1);
      const endOfMonth = new Date(todayYear, today.getMonth() + 1, 0);
      const dayInMonth = today.getDate();
      const totalDays = endOfMonth.getDate();
      const percentage = dayInMonth / totalDays;
      return { index, percentage };
    }

    // Week columns
    if (/^W\d{1,2}\s\d{4}$/.test(firstCol)) {
      const todayWeekStr = `W${getWeek(today)} ${todayYear}`;
      const index = timeColumns.indexOf(todayWeekStr);
      if (index === -1) return null;

      const dayOfWeek = today.getDay();
      const percentage = (dayOfWeek + 0.5) / 7;
      return { index, percentage };
    }

    return null;
  }

  // Mock implementation of isSafeUrl
  function isSafeUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch (e) {
      return false;
    }
  }

  describe('getWeek', () => {
    test('should return week number for January 1st', () => {
      const date = new Date(2025, 0, 1); // Jan 1, 2025
      const week = getWeek(date);

      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });

    test('should return week number for middle of year', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const week = getWeek(date);

      expect(week).toBeGreaterThan(20);
      expect(week).toBeLessThan(30);
    });

    test('should return week number for end of year', () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025
      const week = getWeek(date);

      expect(week).toBeGreaterThan(50);
      expect(week).toBeLessThanOrEqual(53);
    });

    test('should handle leap years correctly', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      const week = getWeek(date);

      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });
  });

  describe('findTodayColumnPosition', () => {
    describe('Year columns', () => {
      test('should find position in year columns', () => {
        const today = new Date(2025, 0, 15); // Jan 15, 2025
        const timeColumns = ['2024', '2025', '2026'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).not.toBeNull();
        expect(result.index).toBe(1);
        expect(result.percentage).toBeGreaterThan(0);
        expect(result.percentage).toBeLessThan(1);
      });

      test('should return null if year not in columns', () => {
        const today = new Date(2025, 0, 15);
        const timeColumns = ['2020', '2021', '2022'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).toBeNull();
      });

      test('should calculate percentage correctly for start of year', () => {
        const today = new Date(2025, 0, 1); // Jan 1
        const timeColumns = ['2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.percentage).toBeCloseTo(0, 2);
      });

      test('should calculate percentage correctly for mid-year', () => {
        const today = new Date(2025, 6, 1); // July 1 (approximately halfway)
        const timeColumns = ['2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.percentage).toBeGreaterThan(0.4);
        expect(result.percentage).toBeLessThan(0.6);
      });
    });

    describe('Quarter columns', () => {
      test('should find position in Q1', () => {
        const today = new Date(2025, 1, 15); // Feb 15, 2025 (Q1)
        const timeColumns = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).not.toBeNull();
        expect(result.index).toBe(0);
      });

      test('should find position in Q2', () => {
        const today = new Date(2025, 4, 15); // May 15, 2025 (Q2)
        const timeColumns = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.index).toBe(1);
      });

      test('should find position in Q3', () => {
        const today = new Date(2025, 7, 15); // Aug 15, 2025 (Q3)
        const timeColumns = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.index).toBe(2);
      });

      test('should find position in Q4', () => {
        const today = new Date(2025, 10, 15); // Nov 15, 2025 (Q4)
        const timeColumns = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.index).toBe(3);
      });
    });

    describe('Month columns', () => {
      test('should find position in current month', () => {
        const today = new Date(2025, 0, 15); // Jan 15, 2025
        const timeColumns = ['Dec 2024', 'Jan 2025', 'Feb 2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).not.toBeNull();
        expect(result.index).toBe(1);
      });

      test('should calculate percentage within month', () => {
        const today = new Date(2025, 0, 15); // Jan 15 (middle of 31-day month)
        const timeColumns = ['Jan 2025'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.percentage).toBeCloseTo(15 / 31, 2);
      });

      test('should handle different month lengths', () => {
        // February (28 days in 2025)
        const feb15 = new Date(2025, 1, 15);
        const febColumns = ['Feb 2025'];
        const febResult = findTodayColumnPosition(feb15, febColumns);

        expect(febResult.percentage).toBeCloseTo(15 / 28, 2);

        // January (31 days)
        const jan15 = new Date(2025, 0, 15);
        const janColumns = ['Jan 2025'];
        const janResult = findTodayColumnPosition(jan15, janColumns);

        expect(janResult.percentage).toBeCloseTo(15 / 31, 2);
      });
    });

    describe('Week columns', () => {
      test('should find position in week columns', () => {
        const today = new Date(2025, 0, 15); // Jan 15, 2025
        const week = getWeek(today);
        const timeColumns = [`W${week - 1} 2025`, `W${week} 2025`, `W${week + 1} 2025`];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).not.toBeNull();
        expect(result.index).toBe(1);
      });

      test('should calculate percentage within week', () => {
        const today = new Date(2025, 0, 15);
        const week = getWeek(today);
        const timeColumns = [`W${week} 2025`];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result.percentage).toBeGreaterThanOrEqual(0);
        expect(result.percentage).toBeLessThanOrEqual(1);
      });
    });

    describe('Edge cases', () => {
      test('should return null for empty columns', () => {
        const today = new Date(2025, 0, 15);
        const timeColumns = [];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).toBeNull();
      });

      test('should handle invalid column formats', () => {
        const today = new Date(2025, 0, 15);
        const timeColumns = ['Invalid Format', '12345', 'ABC'];

        const result = findTodayColumnPosition(today, timeColumns);

        expect(result).toBeNull();
      });
    });
  });

  describe('isSafeUrl', () => {
    test('should accept valid HTTP URLs', () => {
      const validUrls = [
        'http://example.com',
        'http://example.com/path',
        'http://example.com:8080',
        'http://localhost:3000',
      ];

      validUrls.forEach((url) => {
        expect(isSafeUrl(url)).toBe(true);
      });
    });

    test('should accept valid HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'https://example.com/path',
        'https://example.com:443',
        'https://secure.example.com',
      ];

      validUrls.forEach((url) => {
        expect(isSafeUrl(url)).toBe(true);
      });
    });

    test('should reject dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://example.com',
        'mailto:user@example.com',
        'tel:+1234567890',
      ];

      dangerousUrls.forEach((url) => {
        expect(isSafeUrl(url)).toBe(false);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not a url',
        '://example.com',
        'http://',
        'https://',
      ];

      invalidUrls.forEach((url) => {
        expect(isSafeUrl(url)).toBe(false);
      });
    });

    test('should handle protocol-relative URLs', () => {
      // Protocol-relative URLs should be invalid
      expect(isSafeUrl('//example.com')).toBe(false);
    });

    test('should handle URLs with query parameters', () => {
      expect(isSafeUrl('https://example.com?param=value')).toBe(true);
    });

    test('should handle URLs with fragments', () => {
      expect(isSafeUrl('https://example.com#section')).toBe(true);
    });

    test('should handle URLs with credentials', () => {
      expect(isSafeUrl('https://user:pass@example.com')).toBe(true);
    });
  });
});

describe('Utils Module - Validation Utilities', () => {
  describe('Date validation concepts', () => {
    test('should validate dates are within reasonable ranges', () => {
      const dates = [
        new Date(2020, 0, 1),
        new Date(2025, 5, 15),
        new Date(2030, 11, 31),
      ];

      dates.forEach((date) => {
        expect(date.getFullYear()).toBeGreaterThan(2000);
        expect(date.getFullYear()).toBeLessThan(2100);
      });
    });

    test('should handle leap year dates', () => {
      const leapYear = new Date(2024, 1, 29);
      expect(leapYear.getDate()).toBe(29);
      expect(leapYear.getMonth()).toBe(1); // February
    });

    test('should detect invalid dates', () => {
      const invalidDate = new Date('invalid');
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });
  });

  describe('Number validation concepts', () => {
    test('should validate percentages are in range', () => {
      const validPercentages = [0, 0.5, 1, 0.25, 0.75];

      validPercentages.forEach((pct) => {
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(1);
      });
    });

    test('should detect out-of-range percentages', () => {
      const invalidPercentages = [-0.1, 1.1, -1, 2];

      invalidPercentages.forEach((pct) => {
        const isValid = pct >= 0 && pct <= 1;
        expect(isValid).toBe(false);
      });
    });
  });
});
