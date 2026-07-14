import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_OPERATION_TIMEOUT, withOperationTimeout } from "../../renderer/async-operation.js";

test("tác vụ hoàn thành trước timeout trả đúng kết quả", async () => {
  assert.equal(await withOperationTimeout(Promise.resolve("OK"), 50), "OK");
});

test("tác vụ treo bị từ chối bằng reason ổn định", async () => {
  await assert.rejects(withOperationTimeout(new Promise<never>(() => undefined), 5), new RegExp(LOCAL_OPERATION_TIMEOUT));
});
