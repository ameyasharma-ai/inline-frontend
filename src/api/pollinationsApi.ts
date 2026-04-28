import axios, { AxiosInstance } from "axios"

const pollinationsBaseUrl = "https://text.pollinations.ai/openai"

const instance: AxiosInstance = axios.create({
    baseURL: pollinationsBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
})

export default instance
