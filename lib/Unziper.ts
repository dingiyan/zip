import * as yauzl from "yauzl";

import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

/** unzip zip file */
export class Unziper {
	private logger: (str: string, ...params: any[]) => void = (str: string, ...params: any[]) => {
		console.log(str, ...params);
	};
	/**
	 * Creates an instance of Unziper.
	 * @param {string}  origin will unzip file path
	 * @param {string} targetDirPath unzip to target directory path, if not exist, will create it
	 * @memberof Unziper
	 */
	constructor(private origin: string, private targetDirPath?: string) {
		if (!fs.existsSync(origin)) {
			throw new Error(`not found the zip file: ${origin}`);
		}
	}

	/**
	 * create an unzip instance object
	 *
	 * @static
	 * @param {string} origin will unzip file path
	 * @param {string} targetDirPath unzip to target directory path, if not exist, will create it
	 * @return {*}
	 * @memberof Unziper
	 */
	static init(origin: string, targetDirPath?: string) {
		return new Unziper(origin, targetDirPath);
	}
	/** exec unzip
	 * @param {string} targetDirPath will unzip to the directory path, optional, if new Unziper provide it
	 *
	 */
	async unzip(targetDirPath?: string) {
		targetDirPath = this.initCreateTargetDir(targetDirPath);
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
						const fullPath = path.join(targetDirPath!, entry.fileName);

						// first try create directory
						try {
							this.createDir(fullPath);
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
							const writeStream = fs.createWriteStream(fullPath);
							writeStream.on("error", reject);
							readStream.pipe(writeStream);
						});
					}
				});
				zipfile.on("close", () => {
					resolve();
				});
				zipfile.on("error", reject);
				zipfile.readEntry();
			});
		});
	}

	/**
	 *
	 * extract some part file
	 *
	 * @param {string} tailPath the tail path, will recursive all entry
	 * @param {string} targetDirPath will unzip to the directory path, optional, if new Unziper provide it
	 * @return {*}
	 * @memberof Unziper
	 */
	async extractSome(tailPath: string, targetDirPath?: string) {
		targetDirPath = this.initCreateTargetDir(targetDirPath);
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

						if (!entry.fileName.endsWith(tailPath)) {
							zipfile.readEntry();
							return;
						}
						const fullPath = path.join(targetDirPath!, entry.fileName);

						// first try create directory
						try {
							this.createDir(fullPath);
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
							const fullPath = path.join(targetDirPath!, entry.fileName);
							const writeStream = fs.createWriteStream(fullPath);
							writeStream.on("error", reject);
							readStream.pipe(writeStream);
						});
					}
				});
				zipfile.on("close", () => {
					resolve();
				});
				zipfile.on("error", reject);
				zipfile.readEntry();
			});
		});
	}

	/**
	 *
	 * extract one file
	 *
	 * @param {string} tailPath the tail path, will stop once matched the tail path
	 * @param {string} targetDirPath will unzip to the directory path, optional, if new Unziper provide it
	 * @return {*}
	 * @memberof Unziper
	 */
	async extractOne(tailPath: string, targetDirPath?: string) {
		targetDirPath = this.initCreateTargetDir(targetDirPath);
		let foundFilePath: string | null = null;
		return new Promise<string | null>((resolve, reject) => {
			yauzl.open(this.origin, { lazyEntries: true }, (err, zipfile) => {
				if (err) return reject(err);
				zipfile.on("entry", (entry: yauzl.Entry) => {
					// console.log(entry.fileName);
					if (/\/$/.test(entry.fileName)) {
						zipfile.readEntry();
						return;
					}
					// file entry
					if (!entry.fileName.endsWith(tailPath)) {
						zipfile.readEntry();
						return;
					}
					const fullPath = path.join(targetDirPath, entry.fileName);
					// first try create directory
					try {
						this.createDir(fullPath);
					} catch (error) {
						return reject(error);
					}

					// then create file
					zipfile.openReadStream(entry, (err, readStream) => {
						if (err) return reject(err);
						readStream.on("end", () => {
							// 不再继续读取entry
							// zipfile.readEntry();
							// 将文件path 返回
							foundFilePath = path.join(targetDirPath!, entry.fileName);
							// 仅提取一个文件，需要关闭zip
							zipfile.close();
						});
						readStream.on("error", reject);
						const writeStream = fs.createWriteStream(fullPath);
						writeStream.on("error", reject);
						readStream.pipe(writeStream);
					});
				});
				zipfile.on("close", () => {
					resolve(foundFilePath);
				});
				zipfile.on("error", reject);
				zipfile.readEntry();
			});
		});
	}

	/**
	 *
	 * extract one file  , will return a Readable if find.
	 *
	 * @param {string} tailPath the tail path, will stop once matched the tail path
	 * @return {Readable | null}
	 * @memberof Unziper
	 */
	async extractOneStream(tailPath: string) {
		let isFoundFile = false;
		return new Promise<Readable | null>((resolve, reject) => {
			yauzl.open(this.origin, { lazyEntries: true }, (err, zipfile) => {
				if (err) return reject(err);
				zipfile.on("entry", (entry: yauzl.Entry) => {
					if (/\/$/.test(entry.fileName)) {
						zipfile.readEntry();
						return;
					}
					// file entry
					if (!entry.fileName.endsWith(tailPath)) {
						zipfile.readEntry();
						return;
					}

					zipfile.openReadStream(entry, (err, readStream) => {
						if (err) return reject(err);
						readStream.on("end", () => {
							zipfile.close();
						});
						isFoundFile = true;
						resolve(readStream);
					});
				});
				zipfile.on("close", () => {
					if (!isFoundFile) {
						resolve(null);
					}
				});
				zipfile.on("error", reject);
				zipfile.readEntry();
			});
		});
	}

	private createDir(fullPath: string) {
		const dirPath = path.dirname(fullPath); // 获取父级目录，因filePath是文件名
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
		return true;
	}

	private initCreateTargetDir(targetDirPath?: string) {
		targetDirPath = targetDirPath || this.targetDirPath;
		if (!targetDirPath) {
			throw new Error("targetDirPath is required");
		}
		if (!fs.existsSync(targetDirPath)) {
			fs.mkdirSync(targetDirPath);
		}
		return targetDirPath;
	}

	/** 设置日志回调函数 */
	setLogger(logger: (str: string, ...params: any[]) => void) {
		this.logger = logger;
	}
}
