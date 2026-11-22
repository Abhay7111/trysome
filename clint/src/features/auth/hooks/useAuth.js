import { useContext } from "react";
import {AuthContext} from "../auth.context";
import {login, register} from '../services/auth.api'

export const useAuth = () => {
    const context = useContext(AuthContext)

    const {user, setUser, loading, setLoading} = context

    const handelLogin = async (username, password) => {
        setLoading(true)
        try {
            const response = await login(username, password)
            setUser(response.user)
            return response
        } finally {
            setLoading(false)
        }
    }
    const handelRegister = async (username,email, password) => {
        setLoading(true)
        try {
            const response = await register(username,email, password)
            setUser(response.user)
            return response
        } finally {
            setLoading(false)
        }
    }

    return {user, loading, handelLogin, handelRegister}
}