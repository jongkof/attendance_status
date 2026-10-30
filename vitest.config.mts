import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // tsconfig.json의 "@/*" 경로 별칭을 Vite가 직접 해석한다.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    // 22명 x 날짜 칸을 그리는 컴포넌트 테스트는 CPU 부하가 높으면 기본 5초를 넘긴다.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    exclude: [
      "node_modules/**",
      ".next/**",
      "e2e/**",
      ".claude/worktrees/**",
    ],
  },
});
