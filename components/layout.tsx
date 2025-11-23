import './styles.css';
import { Button } from './ui/button';

const Layout = () => {
  return (
    <div className="bg-background min-w-[300px] min-h-[600px] flex items-center justify-center">
      <Button variant='outline'> Click here </Button>
    </div>
  )
}

export default Layout;