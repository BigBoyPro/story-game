import emailjs from '@emailjs/browser';
import './ContactView.css';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircleArrowLeft} from "@fortawesome/free-solid-svg-icons";



export default function Contact() {
  const [message, setMessage] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const wordLimit = 150;

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const words = e.target.value.trim().split(/\s+/).filter(word => word.length > 0);
    setMessage(e.target.value);
    setWordCount(words.length);
  }
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
  <div className="contact-container">
    <Link to="/" className="back-button">
        <FontAwesomeIcon icon={faCircleArrowLeft} size="3x"/>
    </Link>
    <form className='contact-form' onSubmit={sendEmail}>
                <label>Name</label>
                <input type="text" name="user_name" />
                <label>Email</label>
                <input type="email" name="user_email" />
                <label>Message</label>
                <textarea name="message"
          value={message}
          onChange={handleMessageChange}
          maxLength={wordLimit * 6}/>
          <div className="word-count">{wordCount} / {wordLimit} words</div>
                <button type='submit'>Send</button>
            </form>
  </div> 
  );
}

