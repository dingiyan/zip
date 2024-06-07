import * as yauzl from "yauzl";

import * as fs from "fs";
import * as path from "path";

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
	constructor(private origin: string, private targetDirPath: string) {
		if (!fs.existsSync(origin)) {
			throw new Error(`not found the file:${origin}`);
		}
		if (!fs.existsSync(targetDirPath)) {
			fs.mkdirSync(targetDirPath);
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
	static init(origin: string, targetDirPath: string) {
		return new Unziper(origin, targetDirPath);
	}
	/** exec unzip */
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

	/**
	 *
	 * extract some part file
	 *
	 * @param {string} tailPath the tail path, will recursive all entry
	 * @return {*}
	 * @memberof Unziper
	 */
	async extractSome(tailPath: string) {
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

	/**
	 *
	 * extract one file
	 *
	 * @param {string} tailPath the tail path, will stop once matched the tail path
	 * @return {*}
	 * @memberof Unziper
	 */
	async extractOne(tailPath: string) {
		return new Promise<string>((resolve, reject) => {
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
								// zipfile.readEntry();
								// 仅提取一个文件，需要关闭zip
								zipfile.close();
								// 将文件path 返回
								resolve(path.join(this.targetDirPath, entry.fileName));
							});
							readStream.on("error", reject);
							const writeStream = this.createFileWriteStream(entry.fileName);
							writeStream.on("error", reject);
							readStream.pipe(writeStream);
						});
					}
				});
				zipfile.on("close", () => {});
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

	/** 设置日志回调函数 */
	setLogger(logger: (str: string, ...params: any[]) => void) {
		this.logger = logger;
	}
}
