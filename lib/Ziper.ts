import * as archiver from "archiver";

import * as fs from "fs";
import * as path from "path";
import { Writable } from "stream";

/** 压缩文件 */
export class Ziper {
	protected originTarget: string | Writable;
	protected target: Writable;
	private logger: (str: string, ...params: any[]) => void = (str: string, ...params: any[]) => {
		console.log(str, ...params);
	};

	public archive: archiver.Archiver;
	/**
	 * Creates an instance of Ziper.
	 * @param {(string | Writable)} target 要写入的可写流，可传入字符串文件路径，自动转为文件流
	 * @memberof Ziper
	 */
	constructor(target: string | Writable) {
		this.originTarget = target;
		if (typeof target === "string") {
			this.target = fs.createWriteStream(target);
		} else {
			this.target = target;
		}
		this.archive = archiver("zip", { zlib: { level: 9 } });
		this.archive.on("warning", (data) => {
			this.logger("archive warning %s", data);
		});
	}

	/**
	 *
	 *
	 * @static
	 * @param {(string | Writable)} target 要写入的可写流，可传入字符串文件路径，自动转为文件流
	 * @return {*}
	 * @memberof Ziper
	 */
	static init(target: string | Writable) {
		return new Ziper(target);
	}

	/** 添加完文件后，执行此方法进行make zip文件，并写入可写流 */
	async zip() {
		return new Promise<string | Writable | null>((resolve, reject) => {
			if (!this.target) return resolve(null); // 如果target为空，相当于此方法没用，用户应该自行实现stream pipe处理，同时参考此方法on error和最后finalize
			this.target.on("error", reject);
			this.target.on("close", () => {
				resolve(this.originTarget || null);
			});
			this.archive.on("error", reject);
			this.archive.pipe(this.target);
			this.archive.finalize().catch(reject);
		});
	}

	/**
	 * 添加文件进入压缩包
	 *
	 * @param {string} filePath 文件路径string，最好提供全路径
	 * @param {string} [zipFileName] 可选，压缩包内的文件名，可包括目录路径
	 * @memberof Ziper
	 */
	addFile(filePath: string, zipFileName?: string, option?: archiver.EntryData) {
		if (!fs.existsSync(filePath)) {
			this.logger("Error: file %s not exists", filePath);
			throw new Error(`file ${filePath} not exists`);
		}
		this.archive.file(filePath, {
			name: zipFileName || path.basename(filePath),
			...(option || {}),
		});
	}

	/** append a string to file */
	append(origin: string, zipFileName: string, option?: archiver.EntryData): void;
	/** append a stream to file */
	append(origin: fs.ReadStream, zipFileName: string, option?: archiver.EntryData): void;
	/** append a buffer to file */
	append(origin: Buffer, zipFileName: string, option?: archiver.EntryData): void;
	append(origin: any, zipFileName: string, option?: archiver.EntryData) {
		this.archive.append(origin, {
			name: zipFileName,
			...(option || {}),
		});
	}

	/**
	 *
	 * 添加目录进入压缩包
	 *
	 * @param {string} dirPath 源目录路径
	 * @param {(string | false)} zipDir 压缩包内放置路径，false则直接将dirPath内文件放在zip顶层
	 * @param {archiver.EntryData} [option] 可选配置
	 * @memberof Ziper
	 */
	directory(dirPath: string, zipDir: string | false, option?: archiver.EntryData) {
		this.archive.directory(dirPath, zipDir, option);
	}

	/**
	 * use glob pattern to add files into zip
	 *
	 * @param {string} pattern glob pattern
	 * @param {string} cwd glob pattern working directory
	 * @param {Record<string, any>} [option] glob相关配置，具体需深入底层包
	 * @param {archiver.EntryData} [data] 文件属性配置对象
	 * @memberof Ziper
	 */
	glob(pattern: string, cwd: string, option?: Record<string, any>, data?: archiver.EntryData) {
		this.archive.glob(
			pattern,
			{
				cwd,
				...(option || {}),
			},
			data
		);
	}

	/** 设置日志回调函数 */
	setLogger(logger: (str: string, ...params: any[]) => void) {
		this.logger = logger;
	}
}
