import { beforeEach, describe, expect, test, vi } from "vitest";

const store = vi.hoisted(() => ({ addMember: vi.fn(), renameMember: vi.fn(), setRemovedOn: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: vi.fn(async () => false) }));
vi.mock("@/lib/roster/store", () => store);

import { addTeamMember, removeTeamMember, renameTeamMember, restoreTeamMember } from "./actions";

describe("로그인하지 않은 명단 요청", () => {
  beforeEach(() => vi.clearAllMocks());

  test("추가·수정·제거·제거 취소가 모두 거절되고 아무것도 저장되지 않는다", async () => {
    const results = [
      await addTeamMember("신ㅇㅇ", "2026-10-30"),
      await renameTeamMember(1, "새ㅇㅇ"),
      await removeTeamMember(1, "2026-10-30"),
      await restoreTeamMember(1),
    ];
    for (const result of results) expect(result).toEqual({ ok: false, error: expect.stringContaining("로그인") });
    expect(store.addMember).not.toHaveBeenCalled();
    expect(store.renameMember).not.toHaveBeenCalled();
    expect(store.setRemovedOn).not.toHaveBeenCalled();
  });
});
