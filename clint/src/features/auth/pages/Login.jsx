import React, { useState } from "react";
import { Link } from "react-router";
import "../styles/form.scss";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router";

const Login = () => {
  const { loading, handelLogin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const navigate = useNavigate();

  const handelSubmit = async (e) => {
    e.preventDefault();
    setServerMessage("");
    try {
      await handelLogin(username, password);
      navigate("/");
    } catch (error) {
      setServerMessage(
        error.response?.data?.message || "Unable to log in. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    );
  }
  return (
    <main>
      <h1>Login</h1>
      <form onSubmit={handelSubmit}>
        <div className="inputs">
          <input
          onInput={(e) => setUsername(e.target.value)}
            type="text"
            name="username"
            id="username"
            placeholder="Enter username"
          />
          <input
          onInput={(e) => setPassword(e.target.value)}
            type="password"
            name="password"
            id="password"
            placeholder="Enter password"
          />
        </div>
        {serverMessage && (
          <p className="server-message" role="alert">
            {serverMessage}
          </p>
        )}
        <div className="button">
          <button type="submit">Login</button>
        </div>
      </form>
      <p>
        Don't have account!{" "}
        <span>
          <Link to={"/register"}>create account</Link>
        </span>
      </p>
    </main>
  );
};

export default Login;
