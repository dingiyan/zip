import * as archiver from "archiver";
import * as yauzl from "yauzl";

import * as fs from "fs";
import * as path from "path";
import { Writable } from "stream";

/** 压缩文件 */
export class Ziper {
	protected originTarget: string | Writable;
	protected target: Writable;
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
			console.log("archive warning ", data);
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
			if (!this.target) return resolve(null);
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
		this.archive.file(filePath, {
			name: zipFileName || path.basename(filePath),
			...(option || {}),
		});
	}

	/** append a string to file */
	appendFile(origin: string, zipFileName: string, option?: archiver.EntryData): void;
	/** append a stream to file */
	appendFile(origin: fs.ReadStream, zipFileName: string, option?: archiver.EntryData): void;
	/** append a buffer to file */
	appendFile(origin: Buffer, zipFileName: string, option?: archiver.EntryData): void;
	appendFile(origin: any, zipFileName: string, option?: archiver.EntryData) {
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
}

/** 解压zip文件 */
export class Unziper {
	/**
	 * Creates an instance of Unziper.
	 * @param {string} origin 要解压的文件path
	 * @param {string} targetDirPath 解压目标目录（若无，将自动创建）
	 * @memberof Unziper
	 */
	constructor(private origin: string, private targetDirPath: string) {
		if (!fs.existsSync(targetDirPath)) {
			fs.mkdirSync(targetDirPath);
		}
	}

	/**
	 * 创建解压对象实例
	 *
	 * @static
	 * @param {string} origin 要解压的文件path
	 * @param {string} targetDirPath 解压目标目录（若无，将自动创建）
	 * @return {*}
	 * @memberof Unziper
	 */
	static init(origin: string, targetDirPath: string) {
		return new Unziper(origin, targetDirPath);
	} 
	/** 执行解压 */
	async unzip() {
		return new Promise<void>((resolve, reject) => {
			yauzl.open(this.origin, { lazyEntries: true }, (err, zipfile) => {
				if (err) return reject(err);
				zipfile.on("entry", (entry: yauzl.Entry) => {
					// console.log(entry.fileName);
					if (/\/$/.test(entry.fileName)) {
						// Directory file names end with '/'.
						// Note that entries for directories themselves are optional.
						// An entry's fileName implicitly requires its parent directories to exist.
						zipfile.readEntry();
					} else {
						// file entry

						// first try create directory
						try {
							this.createDir(entry.fileName);
						} catch (error) {
							return reject(error);
						}

						// then create file
						zipfile.openReadStream(entry, (err, readStream) => {
							if (err) return reject(err);
							readStream.on("end", () => {
								zipfile.readEntry();
							});
							readStream.on("error", reject);
							const writeStream = this.createFileWriteStream(entry.fileName);
							writeStream.on("error", reject);
							readStream.pipe(writeStream);
						});
					}
				});
				zipfile.on("end", () => {
					resolve();
				});
				zipfile.readEntry();
			});
		});
	}

	private createDir(filePath: string) {
		const fullPath = path.join(this.targetDirPath, filePath);
		const dirPath = path.dirname(fullPath); // 获取父级目录，因filePath是文件名
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
		return true;
	}

	private createFileWriteStream(subPath: string) {
		const fullPath = path.join(this.targetDirPath, subPath);
		return fs.createWriteStream(fullPath);
	}
}

const zip = { Ziper, Unziper };
export default zip;
