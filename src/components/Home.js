import "./Home.css";
import {ChevronLeft} from "lucide-react";
export function Home(){           
    return (
            <div className='home-container'>
            <div className="indicator">
                <div className='indicator1'><ChevronLeft size={40}/></div>
                <div className='indicator2'><ChevronLeft size={40}/></div>
            </div>
            <div className="grad"></div>
            <div className="home-text">
                <h1 className='heading'>NoteDown!</h1>
                <div className='intro'>
                    <h1 className="welcome">Welcome</h1>
                    <div>
                        The fresh, fast, and fun way to capture everything that matters.
                    </div>
                    <br></br>
                    {/* <br></br> */} 
                    <div>
                        Ideas strike when you least expect them — and now you’ve got the perfect place to keep them! <br></br>
                        Whether it’s quick thoughts, to-dos, class notes, or your next big plan, NoteDown is here to help you stay on top of it all.<br></br>
                        - Why You’ll Love It:<br></br>
                        - Super simple note-taking.<br></br>
                        - Smart organization with IndexedDB.<br></br>
                    </div>
                    ~ Try it now!
                </div>
            </div>
        </div>
    );
};
