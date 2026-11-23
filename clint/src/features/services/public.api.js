import axios from 'axios';

const api = axios.create({
    baseURL: "http://localhost:3000/api"
})

export async function Public() {
    const response = await api.get('/')
    return response.data
}