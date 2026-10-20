import { describe, expect, it } from "vitest";
import { parseStudentListQuery, studentListHref, studentTaskHref, studentListParamsFromUrl } from "./student-navigation";

describe("student navigation", () => {
  it("normalizes query values and only reconstructs allowed parameters", () => {
    const params = Object.fromEntries(new URLSearchParams("search= Ana &status=archived&page=2&pageSize=25&returnTo=https://evil.example"));
    const query = parseStudentListQuery(params);
    expect(query).toEqual({ search: "Ana", status: "archived", page: 2, pageSize: 25 });
    expect(studentListHref(query)).toBe("/dashboard/students?search=Ana&status=archived&page=2&pageSize=25");
    expect(studentTaskHref("/dashboard/students/new", query)).not.toContain("evil");
  });

  it("uses defaults for invalid inputs and clamps limits", () => {
    expect(parseStudentListQuery({ page: "-1", pageSize: "no", status: "removed" })).toEqual({ search: "", page: 1, pageSize: 10, status: "active" });
    expect(parseStudentListQuery({ page: "100000", pageSize: "999", status: "all" })).toMatchObject({ page: 10000, pageSize: 100, status: "all" });
    expect(studentListHref(parseStudentListQuery({ search: "Ana & Bea" }))).toContain("search=Ana+%26+Bea");
  });

  it("normalizes repeated parameters consistently for Next pages and exports", () => {
    const params = new URLSearchParams("search=Ana&search=Bea&page=1&page=2&pageSize=10&pageSize=25&status=archived&status=all");
    const query = parseStudentListQuery(studentListParamsFromUrl(params));
    expect(query).toEqual({ search: "", status: "active", page: 1, pageSize: 10 });
    expect(parseStudentListQuery({ search: ["Ana", "Bea"], page: ["1", "2"] })).toEqual(query);
  });
});
