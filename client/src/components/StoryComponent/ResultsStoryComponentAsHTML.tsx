import React from "react";
import "./StoryComponent.css";
import { StoryElement } from "../../../../shared/sharedTypes.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import { getStoryElementsForEachUser } from "./StoryComponent.ts";
import ReactDOMServer from 'react-dom/server';

export const savedComponentAsHTML = (storyElements: StoryElement[], drawingsAsDataUrls: string[]) => {
    const componentHTML = ReactDOMServer.renderToStaticMarkup(
        <ResultsStoryComponentAsHTML storyElements={storyElements}  />
    );

    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = componentHTML;

    // Function to replace all canvas elements with images
    const replaceCanvasWithImage = () => {
        const canvasElements = tempDiv.getElementsByTagName('canvas');
        for (let i = 0; i < canvasElements.length; i++) {
            const canvas = canvasElements[i];
            const dataUrl = drawingsAsDataUrls[i]; // Assuming the dataUrls are in the same order as canvas elements
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = `Drawing ${i}`;
            canvas.parentNode!.replaceChild(img, canvas);
        }
    };

    // Function to remove all specified elements from the temporary DOM element
    const removeElement = (tagName: string) => {
        const elements = tempDiv.getElementsByTagName(tagName);
        while (elements.length > 0) {
            elements[0].parentNode!.removeChild(elements[0]);
        }
    };

    removeElement('button');
    removeElement('audio');
    replaceCanvasWithImage();

    const cleanedHTML = tempDiv.innerHTML;

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Saved Story</title>
            <style>
                .story-page {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    
                    position: relative;
                    min-height: 100vh;
                    background-size: cover;
                    background-attachment: scroll;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1rem;
                    border-radius: 0.8rem;
                    text-align: center;
                    height: 100vh;
                    width: 100vw;
                    max-width: 80vw;
                    max-height: 100vh;
                    background-color: transparent;
                    
                    box-shadow: 0 0 0.625rem rgba(0, 0, 0, 0.1);
                    z-index: 1;
                    overflow: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    
                }
                .story-page textarea {
                    border: 1px solid #ccc;
                    border-radius: 15px;
                    padding: 10px 15px;
                    font-size: 16px;
                    max-width: 80rem;
                    width: 100%;
                    margin: 10px 0;
                    background-color: #d5c2c2;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    resize: none;
                    outline: none;
                }
                .story-page img {
                
                }
                
                
                @media screen and (max-width: 600px) {
                    .game-box {
                        width: 90%;
                        padding: 1px;
                    }
                }
                
                .game-box-results h2 {
                    text-align: center;
                    color: #333;
                    margin-bottom: 1.25rem;
                }
                
                .story-box-results {
                    border-top: 1px solid #eee;
                    padding-top: 1.25rem;
                }
                
                .story-box-results h3 {
                    text-align: center;
                    color: #666;
                    margin-bottom: 1.25rem;
                }
            </style>
        </head>
        <body>
            ${cleanedHTML}
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'story.html';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('HTML file has been saved.');
}

function ResultsStoryComponentAsHTML({
                                         storyElements,
                                     }: {
    storyElements: StoryElement[],
}) {
    return (
        <div className="story-page">
            {getStoryElementsForEachUser(storyElements).map((elements, index) => {
                return (
                    <React.Fragment key={index}>
                        <StoryUserComponent
                            elements={elements}
                            isEditable={false}
                            resultsProps={{
                                isHidden: false,
                            }}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    );
}

