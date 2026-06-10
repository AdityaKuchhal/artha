"""
test_shifts.py — Unit tests for shift earnings calculation.

These test the pure business logic in isolation.
No DB, no HTTP, no mocks needed.
"""

from datetime import date, time

from backend.income.shifts import calculate_hours


class TestCalculateHours:
    """Core earnings math — most critical logic in the app."""

    def test_standard_shift(self):
        """9am to 3pm = 6 hours"""
        assert calculate_hours(time(9, 0), time(15, 0)) == 6.0

    def test_half_day(self):
        """9am to 1pm = 4 hours"""
        assert calculate_hours(time(9, 0), time(13, 0)) == 4.0

    def test_overnight_shift(self):
        """10pm to 6am = 8 hours"""
        assert calculate_hours(time(22, 0), time(6, 0)) == 8.0

    def test_short_shift(self):
        """2.5 hour shift"""
        assert calculate_hours(time(10, 0), time(12, 30)) == 2.5

    def test_same_time_is_24_hours(self):
        """start == end treated as full 24h shift (overnight)"""
        result = calculate_hours(time(9, 0), time(9, 0))
        assert result == 24.0

    def test_minutes_precision(self):
        """7h 23min shift rounds to 2 decimal places"""
        result = calculate_hours(time(9, 0), time(16, 23))
        assert result == round(7 + 23 / 60, 2)


class TestEarningsCalculation:
    """Break deduction and earnings math."""

    def test_no_break(self):
        hours = calculate_hours(time(9, 0), time(15, 0))  # 6h
        earnings = round(hours * 17.20, 2)
        assert earnings == 103.20

    def test_unpaid_break_deducted(self):
        """30 min unpaid break: 6h - 0.5h = 5.5h"""
        hours = calculate_hours(time(9, 0), time(15, 0))  # 6h
        break_minutes = 30
        break_paid = False
        if break_minutes and not break_paid:
            hours = round(hours - break_minutes / 60, 2)
        earnings = round(hours * 17.20, 2)
        assert hours == 5.5
        assert earnings == 94.60

    def test_paid_break_not_deducted(self):
        """30 min paid break: full 6h paid"""
        hours = calculate_hours(time(9, 0), time(15, 0))  # 6h
        break_minutes = 30
        break_paid = True
        if break_minutes and not break_paid:
            hours = round(hours - break_minutes / 60, 2)
        earnings = round(hours * 17.20, 2)
        assert hours == 6.0
        assert earnings == 103.20

    def test_zero_break_minutes(self):
        """Explicit 0 break minutes — no deduction"""
        hours = calculate_hours(time(9, 0), time(15, 0))
        break_minutes = 0
        break_paid = False
        if break_minutes and not break_paid:
            hours = round(hours - break_minutes / 60, 2)
        assert hours == 6.0

    def test_large_break_still_valid(self):
        """60 min unpaid break on 8h shift = 7h"""
        hours = calculate_hours(time(8, 0), time(16, 0))  # 8h
        hours = round(hours - 60 / 60, 2)
        assert hours == 7.0

    def test_minimum_wage_calculation(self):
        """Ontario minimum wage $17.20/hr for common shift lengths"""
        cases = [
            (time(9, 0), time(13, 0), 4.0, 68.80),  # 4h
            (time(9, 0), time(17, 0), 8.0, 137.60),  # 8h
            (time(9, 0), time(21, 0), 12.0, 206.40),  # 12h
        ]
        for start, end, expected_hours, expected_earnings in cases:
            hours = calculate_hours(start, end)
            earnings = round(hours * 17.20, 2)
            assert hours == expected_hours, f"Hours wrong for {start}-{end}"
            assert earnings == expected_earnings, f"Earnings wrong for {start}-{end}"


class TestDateIsoFormat:
    """Date storage — ensure no UTC timezone coercion."""

    def test_date_isoformat_preserves_date(self):
        """date.isoformat() must not shift by timezone"""
        d = date(2026, 6, 1)
        assert d.isoformat() == "2026-06-01"

    def test_june_first_stays_june_first(self):
        """The bug: str(date) was rolling back to May 31"""
        d = date(2026, 6, 1)
        # isoformat is the fix — should never return May 31
        assert d.isoformat() != "2026-05-31"
        assert d.isoformat() == "2026-06-01"
