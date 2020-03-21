import Redis from "../../lib/redis";
import { expect } from "chai";
import MockServer from "../helpers/mock_server";

describe.only("scratch", function() {
  it("should not choke if multi produces readonly error", async function() {
    let inTransaction = true;
    new MockServer(30000, argv => {
      console.log("MockServer recieved:", argv[0]);

      switch (argv[0]) {
        case "del":
          return inTransaction
            ? new Error("READONLY You can't write against a read only replica.")
            : 1;
        case "set":
          return inTransaction
            ? new Error("READONLY You can't write against a read only replica.")
            : undefined;
        case "get":
          return inTransaction ? MockServer.raw("+QUEUED\r\n") : "bar";
        case "exec":
          inTransaction = false;
          return [];
      }
    });

    const redis = new Redis({
      port: 30000,
      reconnectOnError(err: Error): boolean {
        console.log(">>>reconnect!");
        return 2;
      }
    });

    let result;
    try {
      result = await redis
        .multi()
        .del("foo")
        .set("bar", "baz")
        .exec();
    } catch (err) {
      console.log(">>>Expected error:", err);
    }

    console.log(">>>multi result:", result);
    console.log(">>>get foo result:", await redis.get("foo"));
  });
});
