"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const dompurify_1 = __importDefault(require("dompurify"));
const jsdom_1 = require("jsdom");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const getHtml_1 = require("./getHtml");
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
const window = new jsdom_1.JSDOM("").window;
const DOMPurify = (0, dompurify_1.default)(window);
const pureConfig = {
    // USE_PROFILES: { mathMl: true, svg: true, html: true, svgFilters: true },
    ALLOWED_TAGS: [
        "iframe",
        "a",
        "br",
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "span",
        "pre",
        "code",
        "math",
        "mo",
        "mroot",
        "msup",
        "mi",
        "msub",
        "mn",
        "b",
        "i",
        "strong"
    ],
    ALLOW_DATA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: true,
};
app.use((0, express_fileupload_1.default)({
    limits: {
        fileSize: 1024 * 1024 * 50,
    },
    useTempFiles: true
}));
app.post("/upload", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files)
            throw new Error("No files sent!");
        const directory = `user-upload-${req.ip}`.replace(/[:]/gi, "");
        try {
            yield promises_1.default.access(node_path_1.default.join(__dirname, "public/", directory));
            console.log("Exists directory");
        }
        catch (error) {
            yield promises_1.default.appendFile("error.log", `[${new Date().toDateString()}] Log: Directory created for user with ip${req.ip}`);
            yield promises_1.default.mkdir(node_path_1.default.join(__dirname, "public/", directory));
        }
        const htmlFiles = Object.keys(req.files);
        for (let i = 0; i < htmlFiles.length; i++) {
            const file = req.files[htmlFiles[i]];
            const data = (yield promises_1.default.readFile(file.tempFilePath)).toString();
            const sanitized = DOMPurify.sanitize(data, pureConfig);
            const title = file.name === "index.html" ? "Home" : node_path_1.default.basename(file.name, node_path_1.default.extname(file.name));
            const html = yield (0, getHtml_1.getHtml)(sanitized, title);
            yield promises_1.default.writeFile(node_path_1.default.join(__dirname, "public/", `${directory}/${file.name}`), html);
        }
        res.json({
            //@ts-ignore
            filesUploaded: Object.values(req.files).map(el => el.name),
            uploadedTo: directory,
            success: true
        });
    }
    catch (error) {
        yield promises_1.default.appendFile("error.log", `[${new Date().toDateString()}] Error: ${error}\nUser - ${req.ip}`);
        res.json({
            succes: false,
            error
        });
        throw error;
    }
    return null;
}));
app.get("/list", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dirs = yield promises_1.default.readdir("./public");
        const appDirs = dirs.filter(dir => {
            return dir.startsWith("user-upload-");
        });
        const list = appDirs.map(el => `<a href="${el}" >${el}</a>`).join("<br />");
        const body = `<h1>Here is a list of all available public sites uploaded by users</h1>${list}`;
        const html = yield (0, getHtml_1.getHtml)(body, "List Of ALl Uploaded Files!");
        console.log(html);
        return res.send(html);
    }
    catch (error) {
        console.error(error);
        yield promises_1.default.appendFile("error.log", `[${new Date().toDateString()}] Error: ${error}`);
        return res.send("<h1>An error occoured</h1>");
    }
}));
// app.use("/", express.static(path.join(__dirname, "public/")))
// app.listen(PORT, () => {
//     console.log(`App started on port: ${PORT}`)
// })
module.exports = app;
