import React from 'react'
import { Link } from 'react-router'

const Register = () => {
  return (
    <main>
      <h1>Register</h1>
      <form autoComplete='off'>
        <div className="inputs">
          <input type="text" name="username" id="username" placeholder='Create username' />
          <input type="email" name="email" id="email" placeholder='email' />
          <input type="password" name="password" id="password" placeholder='Create password' />
        </div>
        <div className="button">
          <button type="submit">Register</button>
        </div>
      </form>
      <p>Already have an account! <span><Link to={'/login'}>Go login</Link></span></p>
    </main>
  )
}

export default Register
