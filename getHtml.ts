import fs from "node:fs/promises"

export async function getHtml(html: string, title: string): Promise<string> {
    let template = (await fs.readFile("./public/template.html")).toString()
    template = template.replace("{{title}}", title)
    template = template.replace("{{body}}", html)
    return template
}