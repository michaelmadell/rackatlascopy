import { Link } from '@tanstack/react-router'
import { TbError404 } from 'react-icons/tb'
import * as m from '@/paraglide/messages'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <TbError404 className="text-gray-400 text-6xl mb-3" />
      <p className="text-lg mb-2">{m.page_not_found()}</p>
      <Link to="/app" className="text-brand-blue text-sm">
        {m.back_to_app()}
      </Link>
    </div>
  )
}
