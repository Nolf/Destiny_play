import { test, expect } from "@playwright/test";

test("이름 입력 후 대시보드 진입", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Destiny Doubles")).toBeVisible();

  const nameInput = page.getByPlaceholder("예: 김테니스");
  await nameInput.fill("테스트플레이어");

  await page.getByRole("button", { name: "코트로 입장하기" }).click();

  await expect(page.getByText("Destiny Doubles Dashboard")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("경기 대진표")).toBeVisible({ timeout: 15000 });
});

