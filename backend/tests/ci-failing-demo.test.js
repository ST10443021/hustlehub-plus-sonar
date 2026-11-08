describe("CI failure demo", () => {
  test("deliberately fails to prove the pipeline goes red", () => {
    expect(1 + 1).toBe(3);
  });
});
