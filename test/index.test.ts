import * as assert from "node:assert";
import { describe, it } from "node:test";
import { Unziper, Ziper } from "..";
import * as fs from "fs";

describe("test suite", async () => {
	it("test zip", async () => {
		const ziper = Ziper.init("./test.zip");
		ziper.addFile("./package.json");
		ziper.addFile("./tsconfig.json", "tsconfig2.json");
		ziper.addFile("./.gitignore", ".gitignore");
		await ziper.zip();
		if (fs.existsSync("./test.zip")) {
			fs.unlinkSync("./test.zip");
			return assert.ok(true);
		}
		assert.fail(`create zip file fail`);
	});
	it("test zip add no exist file", async () => {
		const ziper = Ziper.init("./test.zip");
		ziper.addFile("./package.json");
		ziper.addFile("./tsconfig.json", "tsconfig2.json");
		try {
			ziper.addFile("./.gitignore1", ".gitignore");
		} catch (error) {
			assert.ok(true);
		}
		await ziper.zip();
		if (fs.existsSync("./test.zip")) {
			fs.unlinkSync("./test.zip");
			return assert.ok(true);
		}
		assert.fail(`create zip file fail`);
	});

	it("test unzip", async () => {
		const ziper = Ziper.init("./test2.zip");
		ziper.addFile("./package.json");
		ziper.addFile("./tsconfig.json", "tsconfig2.json");
		await ziper.zip();
		if (!fs.existsSync("./test2.zip")) {
			assert.fail(`create zip file fail`);
		}
		const unziper = Unziper.init("./test2.zip", "./test2");
		await unziper.unzip();
		if (fs.existsSync("./test2/package.json") && fs.existsSync("./test2/tsconfig2.json")) {
			assert.ok(true);
			// 清理测试文件
			fs.unlinkSync("./test2.zip");
			setTimeout(() => {
				fs.rmSync("./test2", { recursive: true, force: true });
			}, 10);

			return;
		}
		assert.fail(`unzip file fail`);
	});

	it("test unzip extract one", async () => {
		const ziper = Ziper.init("./test3.zip");
		ziper.addFile("./package.json");
		ziper.addFile("./tsconfig.json", "a/b/c/tsconfig2.json");
		await ziper.zip();
		if (!fs.existsSync("./test3.zip")) {
			assert.fail(`create zip file fail`);
		}
		const unziper = Unziper.init("./test3.zip", "./test3");
		const unzipFilePath = await unziper.extractOne("config2.json");
		// console.log(unzipFilePath);

		if (fs.existsSync(unzipFilePath)) {
			assert.ok(true);
			// 清理测试文件
			fs.unlinkSync("./test3.zip");
			setTimeout(() => {
				fs.rmSync("./test3", { recursive: true, force: true });
			}, 10);

			return;
		}
		assert.fail(`unzip extract one file fail`);
	});
});
