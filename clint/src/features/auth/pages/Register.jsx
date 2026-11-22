import React, { useState } from "react";
import { Link } from "react-router";
import {useAuth} from '../hooks/useAuth'
import { useNavigate } from "react-router";

const Register = () => {
  const {loading, handelRegister} = useAuth()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()
  const [serverMessage, setServerMessage] = useState("")

  const handelSubmit = async (e) => {
    e.preventDefault();
    setServerMessage("");
    try {
      await handelRegister(username, email, password);
      navigate("/");
    } catch (error) {
      setServerMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to register. Please try again."
      );
    }
  }

  if(loading) {
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    )
  }
  return (
    <main>
      <h1>Register</h1>
      <form autoComplete="off" onSubmit={handelSubmit}>
        <div className="inputs">
          <input
          onInput={(e) => setUsername(e.target.value)}
            type="text"
            name="username"
            id="username"
            placeholder="Create username"
            required
          />
          <input 
          onInput={(e) => setEmail(e.target.value)}
            type="email" 
            name="email" 
            id="email" 
            placeholder="email" 
            required
          />
          <input
          onInput={(e) => setPassword(e.target.value)}
            type="password"
            name="password"
            id="password"
            placeholder="Create password"
            required
          />
        </div>
        {serverMessage && (
          <p className="server-message" role="alert">
            {serverMessage}
          </p>
        )}
        <div className="button">
          <button type="submit">Register</button>
        </div>
      </form>
      <p>
        Already have an account!{" "}
        <span>
          <Link to={"/login"}>Go login</Link>
        </span>
      </p>
    </main>
  );
};

export default Register;
