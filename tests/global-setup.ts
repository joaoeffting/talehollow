import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createDraftBookWithChapter, publishBookAndChapter, getChapterId } from "./helpers";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");
const FIXTURES_FILE = path.join(__dirname, ".auth/fixtures.json");

// A fresh book/chapter is seeded on every run (rather than reusing one) so the
// feed-push test's "publishing after this one should rank above it" assumption
// holds — reusing the same book across same-day runs would leave it sitting on
// a last_pushed_at from a previous run instead of "just published".
export default async function globalSetup(config: FullConfig) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set (a real, already " +
        "email-confirmed storyloom account) — see tests/README.md.",
    );
  }

  const baseURL = config.projects[0].use.baseURL as string;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await page.goto("/en/login");
  await page.fill("[name=email]", email);
  await page.fill("[name=password]", password);
  // Scoped to the form specifically — the Log in/Sign up tab picker also
  // renders a same-labeled "Log in" <button> for the tab itself, which an
  // unscoped selector matches first.
  await page.click('form button:has-text("Log in")');
  await page.waitForURL(/\/en\/account/);

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  const runId = Date.now();
  const bookTitle = `Anti-spam test book ${runId}`;
  const chapterTitle = `Anti-spam test chapter ${runId}`;

  const { bookId } = await createDraftBookWithChapter(page, {
    bookTitle,
    chapterTitle,
    chapterBody:
      "Seeded chapter content for anti-spam tests. Repeated visits, likes, and comments against this chapter should all be capped per-user.",
  });
  await publishBookAndChapter(page, bookId, chapterTitle);
  const chapterId = await getChapterId(page, bookId, chapterTitle);

  fs.writeFileSync(
    FIXTURES_FILE,
    JSON.stringify({ bookId, chapterId, bookTitle, chapterTitle }, null, 2),
  );

  await browser.close();
}
