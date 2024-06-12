import React from "react";
import "./StoryComponent.css";
import { StoryElement } from "../../../../shared/sharedTypes.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import { getStoryElementsForEachUser } from "./StoryComponent.ts";
import ReactDOMServer from 'react-dom/server';

export const savedComponentAsHTML = (storyElements: StoryElement[], drawingsAsDataUrls: string[]) => {
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

    const componentHTML = ReactDOMServer.renderToStaticMarkup(
        <ResultsStoryComponentAsHTML storyElements={storyElements}  />
    );

    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = componentHTML;

    // Function to replace all canvas elements with images
    const replaceCanvasWithImage = () => {
        const canvasElements = tempDiv.getElementsByTagName('canvas');
        const canvasArray = Array.from(canvasElements);

        canvasArray.forEach((canvas, i) => {
            const dataUrl = drawingsAsDataUrls[i];
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = `Drawing ${i}`;
            canvas.parentNode!.replaceChild(img, canvas);
        });
    };

    // Function to remove all specified elements from the temporary DOM element
    const filterElements = (tagName: string) => {
        const elements = tempDiv.getElementsByTagName(tagName);
        switch (tagName) {
            case "audio":
                while (elements.length > 0) {
                    const audioElement = elements[0];
                    const label = document.createElement('label');
                    label.textContent = audioElement.getAttribute('src');
                    audioElement.parentNode!.replaceChild(label, audioElement);
                }
                break;
            case "button":
                while (elements.length > 0) {
                    elements[0].parentNode!.removeChild(elements[0]);
                }
                break;
        }
    };

    // Function to remove divs with class "button-container"
    const removeContainers = (containerName: string) => {
        const buttonContainers = tempDiv.getElementsByClassName(containerName);
        while (buttonContainers.length > 0) {
            buttonContainers[0].parentNode!.removeChild(buttonContainers[0]);
        }
    };

    filterElements('audio');
    //
    filterElements('button');
    removeContainers('button-container');
    //
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
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                .story-page {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 20px;
                }
                .story-user {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 20px;
                    border: 1px solid #000;
                    padding: 10px;
                }
                .story-user h2 {
                    margin: 0;
                }
                .story-user-elements h3 {
                    align-items: center;
                    color: #090505;
                }
                .story-user p {
                    margin: 0;
                }
                .story-element {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background-color: #fff; /* Ajoute un fond blanc */
    border: none; /* Supprime la bordure */
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24); /* Ajoute une ombre pour donner de la profondeur */
    transition: all 0.3s cubic-bezier(.25,.8,.25,1); /* Ajoute une transition pour l'effet de survol */
}

.story-element:hover {
    box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23); /* Augmente l'ombre au survol */
}
                .story-element img {
                    max-width: 100%;
                    height: auto;
                }
                .story-element audio {
                    margin-top: 10px;
                }
                .story-element label {
                    margin-top: 10px;
                }
                .story-element p {
                    margin-top: 10px;
                }
                html {
                height: 100%;
                background: linear-gradient(1deg, #C3FDD5, #8EAFF8);
                background-size: cover;
                background-repeat: no-repeat;
                background-attachment: fixed;
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

export default ResultsStoryComponentAsHTML;
