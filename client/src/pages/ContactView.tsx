import emailjs from '@emailjs/browser';
import React, { useRef } from 'react';
import './ContactView.css';
import backButtonIcon from '../assets/icons/backButton.png';
import { Link } from 'react-router-dom';




export default function Contact() {
  function sendEmail(e: React.FormEvent<HTMLFormElement>){
      e.preventDefault();

      emailjs
          .sendForm('service_bh7ry18', 'template_7dkfgwh', e.currentTarget, '5oMw2Lk6gio8TPcE0')
          .then(
              (result) => {
                  console.log('SUCCESS!', result.text);
                  
              },
              (error) => {
                  console.log('FAILED...', error.text);
              }
          );
      e.currentTarget.reset();
  }
  return (
  <div>
    <Link to="/" className="back-button">
                <img src={backButtonIcon} alt="Back Button" />
    </Link>
    <form className='contact-form' onSubmit={sendEmail}>
                <label>Name</label>
                <input type="text" name="user_name" />
                <label>Email</label>
                <input type="email" name="user_email" />
                <label>Message</label>
                <textarea name="message" />
                <button type='submit'>Send</button>
            </form>
  </div> 
  );
}

