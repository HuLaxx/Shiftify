import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://shiftify.vercel.app";

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 1,
        },
        {
            url: `${baseUrl}/transfer`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/import`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/review`,
            lastModified: new Date(),
            changeFrequency: "always",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/runs`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.5,
        },
    ];
}
