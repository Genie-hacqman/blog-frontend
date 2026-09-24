import { buttonClass } from './buttonClass.js'

export default function Button({ variant, className = '', ...props }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />
}
