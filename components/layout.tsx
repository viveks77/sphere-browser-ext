import { MessageTypes } from '@/lib/constants';
import './styles.css';
import { Button } from './ui/button';

const Layout = () => {
  
  const handleClick = async () => {
    try {
      const [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
      if (!currentTab.id) {
        console.error("No active tab found");
        return;
      }

      const response = await browser.tabs.sendMessage(currentTab.id, {
        type: MessageTypes.INITIALIZE_CHAT,
      });
            
      // Handle the new response format
      if (response?.success) {
        console.log("Success:", response.data);
      } else if (response?.error) {
        console.error("Error from content script:", response.error.message);
      }
    
    } catch (e) {
      console.error("Error sending message to content script:", e);
    }
  };
  
  return (
    <div className="bg-background min-w-[300px] min-h-[600px] flex items-center justify-center">
      <Button variant='outline' onClick={handleClick}>
        Click here
      </Button>
    </div>
  );
};

export default Layout;