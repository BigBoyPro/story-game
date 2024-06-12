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
