import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: mocks.from } }));
import { meQuery } from "./session";

beforeEach(() => { vi.resetAllMocks(); });

it("requires sign-in before attempting profile recovery", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  await expect(new QueryClient().fetchQuery({ ...meQuery, retry: false })).rejects.toThrow("Not signed in");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("does not read firm records when profile recovery is rejected", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "caller" } } });
  mocks.rpc.mockResolvedValue({ error: { message: "Invalid client invitation" } });
  await expect(new QueryClient().fetchQuery({ ...meQuery, retry: false })).rejects.toThrow("Invalid client invitation");
  expect(mocks.rpc).toHaveBeenCalledWith("ensure_my_profile");
  expect(mocks.from).not.toHaveBeenCalled();
});

it("reads the authenticated caller profile after recovery and keeps roles from user_roles", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "caller" } } });
  mocks.rpc.mockResolvedValue({ error: null });
  const eq = vi.fn().mockReturnValue({ single: async () => ({ data: { id: "caller", firm_id: "isolated-firm", full_name: "Harsh", firms: { name: "My CA Firm" } } }) });
  mocks.from.mockImplementation((table: string) => table === "profiles" ? { select: () => ({ eq }) } : { select: () => ({ eq: async () => ({ data: [{ role: "admin" }] }) }) });
  const me = await new QueryClient().fetchQuery({ ...meQuery, retry: false });
  expect(eq).toHaveBeenCalledWith("id", "caller");
  expect(me.firm_id).toBe("isolated-firm");
  expect(me.roles).toEqual(["admin"]);
  expect(me.isSuperAdmin).toBe(false);
});