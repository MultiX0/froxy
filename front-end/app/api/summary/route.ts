import { type NextRequest, NextResponse } from "next/server"

const apiKey = process.env.FROXY_APEX_API_KEY || "";
const summerizeApiUrl = process.env.FROXY_APEX_URL


export async function GET(request: NextRequest) {
    try {
        // Get the search query from the request URL
        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get("q")

        if (!query) {
            return NextResponse.json({ error: "Missing search query" }, { status: 400 })
        }

        const response = await fetch(`${summerizeApiUrl}/summary?q=${encodeURIComponent(query)}&apiKey=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });


        // If the external API returns an error, return null without showing an error
        if (!response.ok) {
            console.error(`Summary API error: ${response.status} ${response.statusText}`)
            // Return a 200 status but with a null message to silently handle the error
            return NextResponse.json({ msg: null }, { status: 200 })
        }

        // Get the response data
        const data = await response.json()

        // Return the summary data
        return NextResponse.json({ msg: data.msg, url: data.url }, { status: 200 })
    } catch (error) {
        console.error("Summary API error:", error)
        // Return a 200 status but with a null message to silently handle the error
        return NextResponse.json({ msg: null, url: null }, { status: 200 })
    }
}
