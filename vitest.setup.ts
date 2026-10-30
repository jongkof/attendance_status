import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// globals: false 이므로 Testing Library 자동 cleanup이 걸리지 않는다.
afterEach(cleanup);

// waitFor/findBy 기본 대기(1초)는 부하가 높을 때 큰 표의 클릭 반영을 기다리기에 짧다.
configure({ asyncUtilTimeout: 10_000 });
