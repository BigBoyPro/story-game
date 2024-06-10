/*
import React from "react";
import "./StoryComponent.css"
import {StoryElement} from "../../../../shared/sharedTypes.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import {getStoryElementsForEachUser} from "./StoryComponent.ts";
import ReactDOMServer from 'react-dom/server';

export const savedComponentAsHTML = (storyElements : StoryElement[], drawingsAsDataUrls: string[]) => {

    const componentHTML = ReactDOMServer.renderToStaticMarkup(
        <ResultsStoryComponentAsHTML storyElements={storyElements}
                                     drawingsAsDataUrls={drawingsAsDataUrls} />);


    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Saved Story</title>
        </head>
        <body>
            ${componentHTML}
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], {type: 'text/html'});
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
                                   drawingsAsDataUrls,
}: {
    storyElements: StoryElement[],
    drawingsAsDataUrls: string[],
}) {
    return (

        <div className="story-page">
            {drawingsAsDataUrls.map((dataUrl, index) => (
                <img key={index} src={dataUrl} alt={`Drawing ${index}`} />
            ))}
            {getStoryElementsForEachUser(storyElements).map((elements, index) => {

                return (
                    <React.Fragment key={index}>
                        <StoryUserComponent elements={elements}
                                            isEditable={false}
                                            resultsProps={{
                                                isHidden: false,
                                            }}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    )
}

export default ResultsStoryComponentAsHTML;*/
import React from "react";
import "./StoryComponent.css";
import { StoryElement } from "../../../../shared/sharedTypes.ts";
import StoryUserComponent from "../StoryUserComponent/StoryUserComponent.tsx";
import { getStoryElementsForEachUser } from "./StoryComponent.ts";
import ReactDOMServer from 'react-dom/server';

export const savedComponentAsHTML = (storyElements: StoryElement[], drawingsAsDataUrls: string[]) => {
    const componentHTML = ReactDOMServer.renderToStaticMarkup(
        <ResultsStoryComponentAsHTML storyElements={storyElements} drawingsAsDataUrls={drawingsAsDataUrls} />
    );

    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = componentHTML;

    // Remove all canvas elements from the temporary DOM element
    const canvases = tempDiv.getElementsByTagName('canvas');
    while (canvases.length > 0) {
        canvases[0].parentNode!.removeChild(canvases[0]);
    }

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
                                         drawingsAsDataUrls,
                                     }: {
    storyElements: StoryElement[],
    drawingsAsDataUrls: string[],
}) {
    return (
        <div className="story-page">
            {drawingsAsDataUrls.map((dataUrl, index) => (
                <img key={index} src={dataUrl} alt={`Drawing ${index}`} />
            ))}
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
