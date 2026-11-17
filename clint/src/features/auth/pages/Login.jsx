import React from 'react'
import { Link } from 'react-router'
import '../styles/form.scss'

const Login = () => {
  return (
    <main>
      <h1>Login</h1>
      <form>
        <div className="inputs">
          <input type="text" name="username" id="username" placeholder='Enter username' />
          <input type="password" name="password" id="password" placeholder='Enter password' />
        </div>
        <div className="button">
          <button type="submit">Login</button>
        </div>
      </form>
      <p>Don't have account! <span><Link to={'/register'}>create account</Link></span></p>
    </main>
  )
}

export default Login
