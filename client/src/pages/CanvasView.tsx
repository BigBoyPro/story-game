import "./CanvasView.css";
import DrawingComponent from "../components/DrawingComponent/DrawingComponent.tsx";

function CanvasView() {
    return (
        <div className={"main-page"}>
            <DrawingComponent/>
        </div>
    )
}

export default CanvasView;