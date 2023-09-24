import express, { json } from "express"
import fup, { UploadedFile } from "express-fileupload"
import createDOMPurify, { Config } from "dompurify"
import { JSDOM } from "jsdom"
import fs from "node:fs/promises"
import path from "node:path"
import { getHtml } from "./getHtml"

const PORT = process.env.PORT || 3000


const app = express()
const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window)

const pureConfig: Config = {
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
}

app.use(fup({
    limits: {
        fileSize: 1024 * 1024 * 50,
    },
    useTempFiles: true
}))


app.post("/upload", async (req, res) => {
    try {
        if (!req.files) throw new Error("No files sent!")
        const directory = `user-upload-${req.ip}`.replace(/[:]/gi, "")
        try {
            await fs.access(path.join(__dirname, "public/", directory))
            console.log("Exists directory")
        } catch (error) {
            await fs.appendFile("error.log", `[${new Date().toDateString()}] Log: Directory created for user with ip${req.ip}`)
            await fs.mkdir(path.join(__dirname, "public/", directory))
        }
        const htmlFiles = Object.keys(req.files as unknown as { [id: string]: UploadedFile })
        for (let i = 0; i < htmlFiles.length; i++) {
            const file = req.files[htmlFiles[i]] as unknown as UploadedFile;
            const data = (await fs.readFile(file.tempFilePath)).toString()
            const sanitized = DOMPurify.sanitize(data, pureConfig) as string
            const title = file.name === "index.html" ? "Home" : path.basename(file.name, path.extname(file.name))
            const html = await getHtml(sanitized, title)
            await fs.writeFile(path.join(__dirname, "public/", `${directory}/${file.name}`), html)
        }
        res.json({
            //@ts-ignore
            filesUploaded: Object.values(req.files).map(el => el.name),
            uploadedTo: directory,
            success: true
        })
    } catch (error) {
        await fs.appendFile("error.log", `[${new Date().toDateString()}] Error: ${error}\nUser - ${req.ip}`)
        res.json({
            succes: false,
            error
        })
        throw error
    }
    return null
})

app.get("/list", async (req, res) => {
    try {
        const dirs = await fs.readdir("./public")
        const appDirs = dirs.filter(dir => {
            return dir.startsWith("user-upload-")
        })
        const list = appDirs.map(el => `<a href="${el}" >${el}</a>`).join("<br />")
        const body = `<h1>Here is a list of all available public sites uploaded by users</h1>${list}`
        const html = await getHtml(body, "List Of ALl Uploaded Files!")
        console.log(html)
        return res.send(html)
    } catch (error) {
        console.error(error)
        await fs.appendFile("error.log", `[${new Date().toDateString()}] Error: ${error}`)
        return res.send("<h1>An error occoured</h1>")
    }
})

// app.use("/", express.static(path.join(__dirname, "public/")))

// app.listen(PORT, () => {
//     console.log(`App started on port: ${PORT}`)
// })

export default app