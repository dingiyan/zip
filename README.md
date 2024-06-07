# zip

#### 介绍

封装简化 node 的压缩解压库，提供简洁 api

#### 软件架构

对 archiver 和 yauzl 库封装的，压缩解压库

#### 安装教程

```
npm i @ginreo/zip
```

#### 使用说明

-   zip

```ts
import { Ziper } from "@ginreo/zip";
const ziper = Ziper.init("./test.zip");
ziper.addFile("./package.json");
ziper.addFile("./tsconfig.json", "tsconfig2.json");
ziper.addFile("./.gitignore", ".gitignore");
await ziper.zip();
if (fs.existsSync("./test.zip")) {
}
```

-   unzip

```ts
import { Unziper, Ziper } from "@ginreo/zip";
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
```

-   unzip extract one file

```ts
import { Unziper, Ziper } from "@ginreo/zip";
const ziper = Ziper.init("./test2.zip");
ziper.addFile("./package.json");
const ziper = Ziper.init("./test3.zip");
ziper.addFile("./package.json");
ziper.addFile("./tsconfig.json", "a/b/c/tsconfig2.json");
await ziper.zip();
if (!fs.existsSync("./test3.zip")) {
	assert.fail(`create zip file fail`);
}
const unziper = Unziper.init("./test3.zip", "./test3");

// 提取以config2.json结尾的文件 返回提取出的文件的路径
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
```

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request
