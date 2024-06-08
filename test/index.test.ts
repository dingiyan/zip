import * as assert from "node:assert";
import { describe, it } from "node:test";
import { Unziper, Ziper } from "..";
import * as fs from "fs";

describe("test zip suite", async () => {
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
});

describe("test unzip suite", async () => {
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

		if (unzipFilePath && fs.existsSync(unzipFilePath)) {
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

	it("test unzip  concurrent unzip & extract", async () => {
		const ziper = Ziper.init("./test4.zip");
		ziper.addFile("./package.json");
		ziper.addFile("./tsconfig.json", "a/b/c/tsconfig2.json");
		await ziper.zip();
		if (!fs.existsSync("./test4.zip")) {
			assert.fail(`create zip file fail`);
		}
		const unziper = Unziper.init("./test4.zip", "./test4");
		//  同时执行？是否会报错？好像不会，可同时open一个文件。
		const res = await Promise.all([unziper.unzip(), unziper.extractOne("config2.json")]);
		// console.log(unzipFilePath);

		if (res[1] && fs.existsSync(res[1])) {
			assert.ok(true);
			// 清理测试文件
			fs.unlinkSync("./test4.zip");
			setTimeout(() => {
				fs.rmSync("./test4", { recursive: true, force: true });
			}, 10);

			return;
		}
		assert.fail(`unzip extract one file fail`);
	});

	it("test unzip  extract by read stream", async () => {
		const ziper = Ziper.init("./test5.zip");
		ziper.addFile("./package.json");
		ziper.addFile("./tsconfig.json", "a/b/c/tsconfig2.json");
		await ziper.zip();
		if (!fs.existsSync("./test5.zip")) {
			assert.fail(`create zip file fail`);
		}
		const unziper = Unziper.init("./test5.zip");
		
		const noReadable = await unziper.extractOneStream("/c/config2.json");
		if (noReadable) {
			assert.fail(`should not get readable stream, but got it`);
		}

		const readable = await unziper.extractOneStream("/c/tsconfig2.json");
		if (!readable) {
			assert.fail(
				`unzip extract one file readable stream fail, no /c/tsconfig2.json file, readable is null`
			);
		}
		const writer = fs.createWriteStream("./test5.config2.json");
		readable.pipe(writer);

		await (async () => {
			return new Promise((resolve, reject) => {
				writer.on("error", reject);
				writer.on("finish", resolve);
			});
		})();

		if (fs.existsSync("./test5.config2.json")) {
			assert.ok(true);
			// 清理测试文件
			fs.unlinkSync("./test5.zip");
			fs.unlinkSync("./test5.config2.json");

			return;
		}
		assert.fail(`unzip extract one file fail`);
	});

	it("test unzip big file", { skip: false }, async () => {
		if (!fs.existsSync("./1.zip")) return;
		const unziper = Unziper.init("./1.zip", "./1");
		await unziper.unzip();
		assert.ok(true);
	});
});
