/**
 * Extended UI Component Heuristics & Data Presentation Logic
 * Tests pagination calculations, search filtering predicates, CSV export formatting,
 * and date presentation helpers for Next.js pages (dashboard, customers, followups).
 */

describe("UI Component Heuristics & Client-Side Presentation Logic", () => {
  describe("Pagination Calculations (Pagination Math)", () => {
    function calculatePagination(totalItems, pageSize, currentPage) {
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const page = Math.min(Math.max(1, currentPage), totalPages);
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);

      return {
        totalPages,
        currentPage: page,
        startIndex,
        endIndex,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    }

    test("computes pagination for 100 items with pageSize 10 at page 1", () => {
      const p = calculatePagination(100, 10, 1);
      expect(p.totalPages).toBe(10);
      expect(p.currentPage).toBe(1);
      expect(p.startIndex).toBe(0);
      expect(p.endIndex).toBe(10);
      expect(p.hasNext).toBe(true);
      expect(p.hasPrev).toBe(false);
    });

    test("computes pagination at final page", () => {
      const p = calculatePagination(100, 10, 10);
      expect(p.totalPages).toBe(10);
      expect(p.currentPage).toBe(10);
      expect(p.startIndex).toBe(90);
      expect(p.endIndex).toBe(100);
      expect(p.hasNext).toBe(false);
      expect(p.hasPrev).toBe(true);
    });

    test("handles non-divisible item counts (e.g. 53 items, pageSize 10)", () => {
      const p = calculatePagination(53, 10, 6);
      expect(p.totalPages).toBe(6);
      expect(p.currentPage).toBe(6);
      expect(p.startIndex).toBe(50);
      expect(p.endIndex).toBe(53);
      expect(p.hasNext).toBe(false);
    });

    test("handles zero items without crashing (empty state)", () => {
      const p = calculatePagination(0, 10, 1);
      expect(p.totalPages).toBe(1);
      expect(p.startIndex).toBe(0);
      expect(p.endIndex).toBe(0);
      expect(p.hasNext).toBe(false);
      expect(p.hasPrev).toBe(false);
    });

    test("clamps negative or out-of-range requested page numbers", () => {
      const pNegative = calculatePagination(50, 10, -5);
      expect(pNegative.currentPage).toBe(1);

      const pOver = calculatePagination(50, 10, 999);
      expect(pOver.currentPage).toBe(5);
    });
  });

  describe("Customer Table Search & Filter Predicates", () => {
    const mockCustomers = [
      { id: 1, name: "Acme Industrial Corp", email: "procurement@acme.com", company: "Acme Corp", status: "active" },
      { id: 2, name: "Apex Global Logistics", email: "contact@apexlogistics.com", company: "Apex Logistics", status: "active" },
      { id: 3, name: "Starlight Media Group", email: "partners@starlight.io", company: "Starlight Media", status: "lead" },
      { id: 4, name: "BlueWave Analytics", email: "ops@bluewave.ai", company: "BlueWave AI", status: "churn_risk" },
      { id: 5, name: "Horizon Health Systems", email: "procure@horizonhealth.org", company: "Horizon Health", status: "active" },
    ];

    function filterCustomers(customers, query, statusFilter = "all") {
      const q = (query || "").toLowerCase().trim();
      return customers.filter((c) => {
        const matchesQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q);

        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesQuery && matchesStatus;
      });
    }

    test("filters by name substring case-insensitively", () => {
      const results = filterCustomers(mockCustomers, "acme");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    test("filters by email domain substring", () => {
      const results = filterCustomers(mockCustomers, "starlight.io");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(3);
    });

    test("filters by status category", () => {
      const leads = filterCustomers(mockCustomers, "", "lead");
      expect(leads).toHaveLength(1);
      expect(leads[0].id).toBe(3);

      const active = filterCustomers(mockCustomers, "", "active");
      expect(active).toHaveLength(3);
    });

    test("combines search query with status filter simultaneously", () => {
      const results = filterCustomers(mockCustomers, "apex", "active");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(2);

      const noMatch = filterCustomers(mockCustomers, "apex", "lead");
      expect(noMatch).toHaveLength(0);
    });

    test("returns all customers when query is empty and status is 'all'", () => {
      const all = filterCustomers(mockCustomers, "");
      expect(all).toHaveLength(mockCustomers.length);
    });
  });

  describe("CSV Export Data Transformation", () => {
    function exportCustomersToCSV(customers) {
      const headers = ["ID", "Name", "Email", "Company", "Status"];
      const rows = customers.map((c) => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${c.company.replace(/"/g, '""')}"`,
        c.status,
      ]);

      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    test("serializes customer records into RFC 4180 compliant CSV string", () => {
      const sample = [
        { id: 1, name: "Acme, Inc.", email: "info@acme.com", company: 'Acme "Global"', status: "active" },
        { id: 2, name: "Beta Corp", email: "beta@test.com", company: "Beta", status: "lead" },
      ];

      const csv = exportCustomersToCSV(sample);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("ID,Name,Email,Company,Status");
      expect(lines[1]).toContain('"Acme, Inc."');
      expect(lines[1]).toContain('"Acme ""Global"""');
      expect(lines[2]).toBe('2,"Beta Corp","beta@test.com","Beta",lead');
    });
  });

  describe("Date Localization & Relative Time Presentation", () => {
    function formatRelativeDays(days) {
      const d = Number(days);
      if (isNaN(d) || d < 0) return "Unknown";
      if (d === 0) return "Today";
      if (d === 1) return "1 day ago";
      if (d < 7) return `${d} days ago`;
      if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
      return `${Math.floor(d / 30)} months ago`;
    }

    test("formats 0 as 'Today'", () => {
      expect(formatRelativeDays(0)).toBe("Today");
    });

    test("formats 1 as '1 day ago'", () => {
      expect(formatRelativeDays(1)).toBe("1 day ago");
    });

    test("formats days between 2 and 6 as 'X days ago'", () => {
      expect(formatRelativeDays(3)).toBe("3 days ago");
      expect(formatRelativeDays(6)).toBe("6 days ago");
    });

    test("formats weeks for intervals between 7 and 29 days", () => {
      expect(formatRelativeDays(7)).toBe("1 weeks ago");
      expect(formatRelativeDays(14)).toBe("2 weeks ago");
      expect(formatRelativeDays(21)).toBe("3 weeks ago");
    });

    test("formats months for intervals >= 30 days", () => {
      expect(formatRelativeDays(30)).toBe("1 months ago");
      expect(formatRelativeDays(60)).toBe("2 months ago");
      expect(formatRelativeDays(120)).toBe("4 months ago");
    });

    test("handles invalid inputs safely", () => {
      expect(formatRelativeDays(null)).toBe("Today");
      expect(formatRelativeDays(-5)).toBe("Unknown");
      expect(formatRelativeDays("bad")).toBe("Unknown");
    });
  });
});
