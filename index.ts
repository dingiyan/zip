import * as archiver from "archiver";
import { Unziper } from "./lib/Unziper";
import { Ziper } from "./lib/Ziper";

const zip = { Ziper, Unziper };
export default zip;
export { Ziper, Unziper };

/** the archive entry data */
export type EntryData = archiver.EntryData;


