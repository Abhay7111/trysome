import axios from 'axios';

const api = axios.create({
    baseURL: "http://localhost:3000/api/auth",
    withCredentials: true
})

export async function login(username, password) {
    const response = await api.post('/login', {
        username,
        password
    })

    return response.data
}
export async function register(username, email, password) {
    const response = await api.post('/register', {
        username,
        email,
        password
    })

    return response.data
}
export async function getMe() {
    const response = await api.get('/getme')
    return response.data
}

export async function updateProfileImage(image) {
    const formData = new FormData()
    formData.append('image', image)
    const response = await api.put('/profile/image', formData)
    return response.data
}

export async function updateProfileBanner(image) {
    const formData = new FormData()
    formData.append('image', image)
    const response = await api.put('/profile/banner', formData)
    return response.data
}

export async function updateProfileDetails(username, bio) {
    const response = await api.patch('/profile', { username, bio })
    return response.data
}

export async function updateProfilePrivacy(isPrivate) {
    const response = await api.patch('/profile/privacy', { isPrivate })
    return response.data
}

export async function logout() {
    const response = await api.post('/logout')
    return response.data
}